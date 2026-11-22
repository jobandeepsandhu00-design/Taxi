import "server-only";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { LERNBUCH_TOPICS } from "@/lib/lernbuch";
import { AUDIO_KINDS, type AudioKind } from "@/lib/tts/prepare";
import { opusEnabled, TtsError } from "@/lib/tts/provider";
import { publishedWhere } from "@/server/questions";
import { audioItemSpec, getAudioConfig, getLexicon, questionAudioSelect, toAudioQuestion } from "./config";
import { deleteAudioFiles, storageMode, uploadAudioFile } from "./storage";

export type AudioScope = "all" | "topic" | "chapter" | "question" | "missing";
export type VoiceMode = "default" | "both";

export const BATCH_SIZE = 10;
const MAX_RETRIES = 3;
/** Grobe Geschwindigkeit für die Zeitschätzung (Dateien pro Minute bei 10 parallelen Anfragen) */
const FILES_PER_MINUTE = 60;

export function workerSecret(): string {
  return createHash("sha256").update(`${process.env.AUTH_SECRET ?? "dev"}|audio-worker`).digest("hex");
}

async function questionsInScope(scope: AudioScope, scopeId?: string | null) {
  const where: Prisma.QuestionWhereInput = { ...publishedWhere, category: { isActive: true } };
  if (scope === "chapter" && scopeId) where.categoryId = scopeId;
  if (scope === "question" && scopeId) where.id = scopeId;
  if (scope === "topic" && scopeId) {
    const slugs = LERNBUCH_TOPICS.find((t) => t.id === scopeId)?.slugs ?? [];
    where.category = { isActive: true, slug: { in: slugs } };
  }
  return prisma.question.findMany({ where, select: questionAudioSelect });
}

export type PlannedItem = { questionId: string; kind: AudioKind; voiceId: string; hash: string; characters: number };

/** Was müsste erzeugt werden? (für Schätzung und Auftrag) */
export async function planAudio(opts: { scope: AudioScope; scopeId?: string | null; voiceMode: VoiceMode; kinds: AudioKind[]; force: boolean }): Promise<{ items: PlannedItem[]; questions: number }> {
  const [cfg, lexicon, questions] = await Promise.all([getAudioConfig(), getLexicon(), questionsInScope(opts.scope, opts.scopeId)]);
  const voices = opts.voiceMode === "both" ? [cfg.voices.female, cfg.voices.male].filter(Boolean) : [cfg.defaultVoiceId];
  const kinds = opts.kinds.filter((k) => AUDIO_KINDS.includes(k));
  const existing = await prisma.questionAudio.findMany({
    where: { questionId: { in: questions.map((q) => q.id) }, voiceId: { in: voices } },
    select: { questionId: true, kind: true, voiceId: true, status: true, textHash: true, source: true },
  });
  const map = new Map(existing.map((e) => [`${e.questionId}|${e.kind}|${e.voiceId}`, e]));
  const items: PlannedItem[] = [];
  for (const q of questions) {
    const aq = toAudioQuestion(q);
    for (const voiceId of voices) {
      for (const kind of kinds) {
        const spec = audioItemSpec(kind, aq, voiceId, lexicon);
        if (!spec) continue;
        const e = map.get(`${q.id}|${kind}|${voiceId}`);
        if (e?.source === "upload") continue; // eigene Aufnahme hat Vorrang
        const fresh = e?.status === "done" && e.textHash === spec.hash;
        if (fresh && (!opts.force || opts.scope === "missing")) continue;
        items.push({ questionId: q.id, kind, voiceId, hash: spec.hash, characters: spec.characters });
      }
    }
  }
  return { items, questions: questions.length };
}

export async function estimateAudio(opts: Parameters<typeof planAudio>[0]) {
  const [{ items, questions }, cfg] = await Promise.all([planAudio(opts), getAudioConfig()]);
  const characters = items.reduce((s, i) => s + i.characters, 0) * (opusEnabled() ? 2 : 1);
  return {
    questions,
    files: items.length,
    characters,
    costEur: Math.round(((characters / 1_000_000) * cfg.pricePerMillion) * 100) / 100,
    minutes: Math.max(1, Math.ceil(items.length / FILES_PER_MINUTE)),
    provider: cfg.provider.label,
    providerReady: cfg.provider.configured(),
    storage: storageMode(),
  };
}

/** Auftrag anlegen: Zeilen auf „pending“ setzen. */
export async function enqueueAudio(opts: Parameters<typeof planAudio>[0] & { startedBy?: string | null; jobScope?: string }): Promise<{ jobId: string | null; total: number }> {
  const { items } = await planAudio(opts);
  if (items.length === 0) return { jobId: null, total: 0 };
  for (let i = 0; i < items.length; i += 200) {
    const chunk = items.slice(i, i + 200);
    await prisma.questionAudio.createMany({ data: chunk.map((c) => ({ questionId: c.questionId, kind: c.kind, voiceId: c.voiceId, status: "pending", characters: c.characters })), skipDuplicates: true });
    await prisma.$executeRaw`
      UPDATE question_audio SET status = 'pending', attempts = 0, error = NULL, updated_at = now()
      WHERE source = 'tts' AND (question_id, kind, voice_id) IN (${Prisma.join(chunk.map((c) => Prisma.sql`(${c.questionId}, ${c.kind}, ${c.voiceId})`))})`;
  }
  const job = await prisma.audioJob.create({
    data: {
      scope: opts.jobScope ?? opts.scope,
      scopeId: opts.scopeId ?? null,
      voiceIds: Array.from(new Set(items.map((i) => i.voiceId))),
      kinds: opts.kinds,
      total: items.length,
      status: "running",
      startedBy: opts.startedBy ?? null,
      estCharacters: items.reduce((s, i) => s + i.characters, 0),
    },
  });
  return { jobId: job.id, total: items.length };
}

/* ───────────── Verarbeitung ───────────── */

type ClaimedRow = { id: string; question_id: string; kind: AudioKind; voice_id: string; attempts: number; storage_path_mp3: string | null; storage_path_opus: string | null };

/** Bis zu n Zeilen exklusiv übernehmen (FOR UPDATE SKIP LOCKED); hängende „processing“ nach 5 Min. zurücksetzen. */
async function claim(n: number): Promise<ClaimedRow[]> {
  await prisma.$executeRaw`UPDATE question_audio SET status = 'pending' WHERE status = 'processing' AND updated_at < now() - interval '5 minutes'`;
  return prisma.$queryRaw<ClaimedRow[]>`
    UPDATE question_audio SET status = 'processing', updated_at = now()
    WHERE id IN (SELECT id FROM question_audio WHERE status = 'pending' AND source = 'tts' ORDER BY updated_at ASC LIMIT ${n} FOR UPDATE SKIP LOCKED)
    RETURNING id, question_id, kind, voice_id, attempts, storage_path_mp3, storage_path_opus`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const retryable = e instanceof TtsError ? e.retryable : true;
      if (!retryable || attempt === MAX_RETRIES) break;
      await sleep(800 * 2 ** attempt + Math.random() * 300);
    }
  }
  throw last;
}

async function processRow(row: ClaimedRow, ctx: { lexicon: Awaited<ReturnType<typeof getLexicon>>; provider: Awaited<ReturnType<typeof getAudioConfig>>["provider"] }): Promise<"done" | "failed" | "skipped"> {
  const q = await prisma.question.findUnique({ where: { id: row.question_id }, select: questionAudioSelect });
  if (!q) {
    await prisma.questionAudio.delete({ where: { id: row.id } }).catch(() => undefined);
    return "skipped";
  }
  const spec = audioItemSpec(row.kind, toAudioQuestion(q), row.voice_id, ctx.lexicon);
  if (!spec) {
    await prisma.questionAudio.delete({ where: { id: row.id } }).catch(() => undefined);
    return "skipped";
  }
  const current = await prisma.questionAudio.findUnique({ where: { id: row.id }, select: { textHash: true, storagePathMp3: true } });
  if (current?.textHash === spec.hash && current.storagePathMp3) {
    await prisma.questionAudio.update({ where: { id: row.id }, data: { status: "done", error: null } });
    return "done";
  }
  try {
    const base = `${row.voice_id}/${row.question_id}_${row.kind}_${spec.hash.slice(0, 16)}`;
    const mp3 = await withRetry(() => ctx.provider.synthesize({ ssml: spec.body, voice: row.voice_id, format: "mp3" }));
    if (mp3.audio.length < 200) throw new Error("Leere Audiodatei vom Anbieter");
    await withRetry(() => uploadAudioFile(`${base}.mp3`, mp3.audio, "audio/mpeg"));
    let opusPath: string | null = null;
    if (opusEnabled()) {
      const opus = await withRetry(() => ctx.provider.synthesize({ ssml: spec.body, voice: row.voice_id, format: "opus" }));
      await withRetry(() => uploadAudioFile(`${base}.opus`, opus.audio, "audio/ogg"));
      opusPath = `${base}.opus`;
    }
    const old = [row.storage_path_mp3, row.storage_path_opus].filter((p): p is string => Boolean(p) && p !== `${base}.mp3` && p !== opusPath);
    await prisma.questionAudio.update({
      where: { id: row.id },
      data: { status: "done", error: null, storagePathMp3: `${base}.mp3`, storagePathOpus: opusPath, durationMs: mp3.durationMs, textHash: spec.hash, characters: spec.characters, attempts: { increment: 1 } },
    });
    if (old.length) void deleteAudioFiles(old);
    return "done";
  } catch (e) {
    await prisma.questionAudio.update({ where: { id: row.id }, data: { status: "failed", error: (e instanceof Error ? e.message : String(e)).slice(0, 500), attempts: { increment: 1 } } });
    return "failed";
  }
}

async function bumpJob(done: number, failed: number, label: string | null) {
  const job = await prisma.audioJob.findFirst({ where: { status: "running" }, orderBy: { startedAt: "asc" } });
  if (!job) return;
  const d = Math.min(job.total, job.done + done);
  const f = Math.min(job.total - d, job.failed + failed);
  const finished = d + f >= job.total;
  await prisma.audioJob.update({ where: { id: job.id }, data: { done: d, failed: f, currentLabel: label, ...(finished ? { status: f > 0 ? "failed" : "done", finishedAt: new Date() } : {}) } });
}

/** Ein Durchlauf: Zeilen in Stapeln à 10 (parallel) verarbeiten, bis das Zeitbudget aufgebraucht ist. */
export async function processAudioQueue(budgetMs = 40_000): Promise<{ processed: number; remaining: number }> {
  const cfg = await getAudioConfig();
  if (!cfg.provider.configured() || !storageMode()) return { processed: 0, remaining: await prisma.questionAudio.count({ where: { status: "pending" } }) };
  const lexicon = await getLexicon();
  const start = Date.now();
  let processed = 0;
  while (Date.now() - start < budgetMs) {
    const rows = await claim(BATCH_SIZE);
    if (rows.length === 0) break;
    const results = await Promise.all(rows.map((r) => processRow(r, { lexicon, provider: cfg.provider })));
    processed += rows.length;
    const q = await prisma.question.findUnique({ where: { id: rows[rows.length - 1].question_id }, select: { category: { select: { name: true } } } });
    await bumpJob(results.filter((r) => r !== "failed").length, results.filter((r) => r === "failed").length, q?.category.name ?? null);
  }
  const remaining = await prisma.questionAudio.count({ where: { status: { in: ["pending", "processing"] } } });
  if (remaining === 0) {
    await prisma.audioJob.updateMany({ where: { status: "running" }, data: { status: "done", finishedAt: new Date() } });
  }
  return { processed, remaining };
}

/** Worker-Route anstoßen (fire-and-forget). */
export async function triggerAudioWorker(origin: string): Promise<void> {
  await fetch(`${origin}/api/audio/worker`, { method: "POST", headers: { "x-audio-worker": workerSecret() }, signal: AbortSignal.timeout(5_000) }).catch(() => undefined);
}

/** Neue/geänderte Fragen automatisch vertonen (Standardstimme, Frage + Antwort). */
export async function autoEnqueueAndKick(origin: string): Promise<void> {
  const cfg = await getAudioConfig();
  if (!cfg.provider.configured() || !storageMode()) return;
  const running = await prisma.audioJob.count({ where: { status: "running" } });
  const pending = await prisma.questionAudio.count({ where: { status: "pending" } });
  if (!running) {
    const { total } = await enqueueAudio({ scope: "missing", voiceMode: "default", kinds: ["question", "answer"], force: false, jobScope: "auto" });
    if (total === 0 && pending > 0) {
      await prisma.audioJob.create({ data: { scope: "auto", voiceIds: [cfg.defaultVoiceId], kinds: ["question", "answer"], total: pending, status: "running" } });
    }
  }
  await triggerAudioWorker(origin);
}
