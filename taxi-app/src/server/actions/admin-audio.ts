"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { LERNBUCH_TOPICS, topicIdForSlug } from "@/lib/lernbuch";
import { AUDIO_KINDS, normalizeForSpeech, type AudioKind } from "@/lib/tts/prepare";
import { mp3DurationMs } from "@/lib/tts/provider";
import { getAudioConfig, getLexicon } from "@/server/audio/config";
import { enqueueAudio, estimateAudio, triggerAudioWorker } from "@/server/audio/jobs";
import { audioPublicUrl, storageMode, uploadAudioFile } from "@/server/audio/storage";
import { publishedWhere } from "@/server/questions";
import type { ActionResult } from "./types";

const kindSchema = z.enum(["question", "answer", "options", "explanation"]);
const optsSchema = z.object({
  scope: z.enum(["all", "topic", "chapter", "question", "missing"]),
  scopeId: z.string().max(80).nullish(),
  voiceMode: z.enum(["default", "both"]),
  kinds: z.array(kindSchema).min(1),
  force: z.boolean(),
});
export type AudioJobOptions = z.infer<typeof optsSchema>;

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function estimateAudioAction(input: AudioJobOptions) {
  await requireAdmin();
  return estimateAudio(optsSchema.parse(input));
}

export async function startAudioJobAction(input: AudioJobOptions): Promise<ActionResult<{ jobId: string | null; total: number }>> {
  const admin = await requireAdmin();
  const opts = optsSchema.parse(input);
  const cfg = await getAudioConfig();
  if (!cfg.provider.configured()) return { ok: false, error: `${cfg.provider.label} ist nicht eingerichtet – Schlüssel in den Vercel-Umgebungsvariablen hinterlegen.` };
  if (!storageMode()) return { ok: false, error: "Speicher nicht eingerichtet (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)." };
  const res = await enqueueAudio({ ...opts, startedBy: admin.id });
  const o = await origin();
  if (res.total > 0) after(() => triggerAudioWorker(o));
  return { ok: true, data: res };
}

export async function retryFailedAudioAction(): Promise<ActionResult<{ total: number }>> {
  const admin = await requireAdmin();
  const n = await prisma.questionAudio.updateMany({ where: { status: "failed", source: "tts" }, data: { status: "pending", attempts: 0, error: null } });
  if (n.count) {
    const cfg = await getAudioConfig();
    await prisma.audioJob.create({ data: { scope: "missing", voiceIds: [cfg.defaultVoiceId], total: n.count, status: "running", startedBy: admin.id } });
    const o = await origin();
    after(() => triggerAudioWorker(o));
  }
  return { ok: true, data: { total: n.count } };
}

export async function kickAudioWorkerAction(): Promise<void> {
  await requireAdmin();
  const o = await origin();
  after(() => triggerAudioWorker(o));
}

export async function cancelAudioJobsAction(): Promise<void> {
  await requireAdmin();
  await prisma.audioJob.updateMany({ where: { status: "running" }, data: { status: "cancelled", finishedAt: new Date() } });
  await prisma.questionAudio.updateMany({ where: { status: { in: ["pending", "processing"] } }, data: { status: "failed", error: "Abgebrochen" } });
}

export type CoverageRow = { id: string; slug: string; name: string; topicId: string; total: number; covered: number; failed: number };
export type AudioStatus = {
  totals: { questions: number; covered: number; missing: number; failed: number; durationMs: number; files: number; pending: number };
  chapters: CoverageRow[];
  topics: { id: string; title: string; total: number; covered: number }[];
  jobs: { id: string; scope: string; status: string; total: number; done: number; failed: number; currentLabel: string | null; startedAt: string; finishedAt: string | null }[];
  failedItems: { id: string; questionId: string; kind: string; voiceId: string; error: string | null; text: string }[];
  provider: { label: string; ready: boolean; storage: "supabase" | "local" | null; voices: { female: string; male: string }; defaultVoice: string; pricePerMillion: number };
};

/** Status fürs Audio-Studio (wird während eines Auftrags alle 2 s abgefragt). */
export async function getAudioStatusAction(): Promise<AudioStatus> {
  await requireAdmin();
  const cfg = await getAudioConfig();
  const voice = cfg.defaultVoiceId;
  const [cats, coveredRows, failedRows, agg, pending, jobs, failedItems] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, orderBy: { order: "asc" }, select: { id: true, slug: true, name: true, _count: { select: { questions: { where: publishedWhere } } } } }),
    // „vertont“ = Frage UND Antwort fertig (Standardstimme)
    prisma.$queryRaw<{ category_id: string; n: number }[]>`
      SELECT q."categoryId" AS category_id, COUNT(*)::int AS n FROM "Question" q
      WHERE q.status = 'PUBLISHED'
        AND EXISTS (SELECT 1 FROM question_audio a WHERE a.question_id = q.id AND a.kind = 'question' AND a.voice_id = ${voice} AND a.status = 'done')
        AND EXISTS (SELECT 1 FROM question_audio a WHERE a.question_id = q.id AND a.kind = 'answer' AND a.voice_id = ${voice} AND a.status = 'done')
      GROUP BY q."categoryId"`,
    prisma.$queryRaw<{ category_id: string; n: number }[]>`
      SELECT q."categoryId" AS category_id, COUNT(DISTINCT q.id)::int AS n FROM "Question" q JOIN question_audio a ON a.question_id = q.id
      WHERE q.status = 'PUBLISHED' AND a.status = 'failed' GROUP BY q."categoryId"`,
    prisma.questionAudio.aggregate({ where: { status: "done" }, _sum: { durationMs: true }, _count: { _all: true } }),
    prisma.questionAudio.count({ where: { status: { in: ["pending", "processing"] } } }),
    prisma.audioJob.findMany({ orderBy: { startedAt: "desc" }, take: 6 }),
    prisma.questionAudio.findMany({ where: { status: "failed" }, take: 30, orderBy: { updatedAt: "desc" }, select: { id: true, questionId: true, kind: true, voiceId: true, error: true, question: { select: { text: true } } } }),
  ]);
  const cov = new Map(coveredRows.map((r) => [r.category_id, r.n]));
  const fail = new Map(failedRows.map((r) => [r.category_id, r.n]));
  const chapters: CoverageRow[] = cats
    .filter((c) => c._count.questions > 0)
    .map((c) => ({ id: c.id, slug: c.slug, name: c.name, topicId: topicIdForSlug(c.slug), total: c._count.questions, covered: Math.min(c._count.questions, cov.get(c.id) ?? 0), failed: fail.get(c.id) ?? 0 }));
  const topics = LERNBUCH_TOPICS.map((t) => {
    const ch = chapters.filter((c) => c.topicId === t.id);
    return { id: t.id, title: t.title, total: ch.reduce((s, c) => s + c.total, 0), covered: ch.reduce((s, c) => s + c.covered, 0) };
  }).filter((t) => t.total > 0);
  const questions = chapters.reduce((s, c) => s + c.total, 0);
  const covered = chapters.reduce((s, c) => s + c.covered, 0);
  return {
    totals: { questions, covered, missing: questions - covered, failed: failedRows.reduce((s, r) => s + r.n, 0), durationMs: agg._sum.durationMs ?? 0, files: agg._count._all, pending },
    chapters,
    topics,
    jobs: jobs.map((j) => ({ id: j.id, scope: j.scope, status: j.status, total: j.total, done: j.done, failed: j.failed, currentLabel: j.currentLabel, startedAt: j.startedAt.toISOString(), finishedAt: j.finishedAt?.toISOString() ?? null })),
    failedItems: failedItems.map((f) => ({ id: f.id, questionId: f.questionId, kind: f.kind, voiceId: f.voiceId, error: f.error, text: f.question.text })),
    provider: { label: cfg.provider.label, ready: cfg.provider.configured(), storage: storageMode(), voices: cfg.voices, defaultVoice: cfg.defaultVoice, pricePerMillion: cfg.pricePerMillion },
  };
}

export async function saveAudioConfigAction(input: { voiceFemale: string; voiceMale: string; defaultVoice: "female" | "male"; pricePerMillion: number }): Promise<ActionResult> {
  await requireAdmin();
  const d = z.object({ voiceFemale: z.string().trim().max(80), voiceMale: z.string().trim().max(80), defaultVoice: z.enum(["female", "male"]), pricePerMillion: z.number().min(0).max(1000) }).parse(input);
  await prisma.audioConfig.upsert({
    where: { id: "default" },
    create: { id: "default", voiceFemale: d.voiceFemale || null, voiceMale: d.voiceMale || null, defaultVoice: d.defaultVoice, pricePerMillion: d.pricePerMillion },
    update: { voiceFemale: d.voiceFemale || null, voiceMale: d.voiceMale || null, defaultVoice: d.defaultVoice, pricePerMillion: d.pricePerMillion },
  });
  revalidatePath("/admin/audio");
  return { ok: true, data: undefined };
}

/* ── Lexikon ── */
export async function listLexiconAction() {
  await requireAdmin();
  return prisma.ttsLexicon.findMany({ orderBy: { term: "asc" } });
}
export async function saveLexiconAction(input: { term: string; spoken: string; notes?: string }): Promise<ActionResult> {
  await requireAdmin();
  const d = z.object({ term: z.string().trim().min(1).max(80), spoken: z.string().trim().min(1).max(200), notes: z.string().trim().max(300).optional() }).parse(input);
  await prisma.ttsLexicon.upsert({ where: { term: d.term }, create: d, update: { spoken: d.spoken, notes: d.notes } });
  return { ok: true, data: undefined };
}
export async function deleteLexiconAction(term: string): Promise<void> {
  await requireAdmin();
  await prisma.ttsLexicon.delete({ where: { term } }).catch(() => undefined);
}
/** So würde der Text gesprochen (Vorschau für das Lexikon). */
export async function previewSpokenAction(text: string): Promise<string> {
  await requireAdmin();
  return normalizeForSpeech(text.slice(0, 2000), await getLexicon());
}

/* ── Vorschau, Stichprobe, Upload ── */
export type AudioFile = { id: string; questionId: string; kind: string; voiceId: string; url: string | null; durationMs: number; status: string; source: string; text: string };

function toFile(r: { id: string; questionId: string; kind: string; voiceId: string; storagePathMp3: string | null; durationMs: number; status: string; source: string; question: { text: string } }): AudioFile {
  return { id: r.id, questionId: r.questionId, kind: r.kind, voiceId: r.voiceId, url: r.storagePathMp3 ? audioPublicUrl(r.storagePathMp3) : null, durationMs: r.durationMs, status: r.status, source: r.source, text: r.question.text };
}
const fileSelect = { id: true, questionId: true, kind: true, voiceId: true, storagePathMp3: true, durationMs: true, status: true, source: true, question: { select: { text: true } } } as const;

export async function questionAudioAction(questionId: string): Promise<{ question: { id: string; text: string } | null; files: AudioFile[] }> {
  await requireAdmin();
  const q = await prisma.question.findUnique({ where: { id: questionId }, select: { id: true, text: true } });
  const rows = await prisma.questionAudio.findMany({ where: { questionId }, select: fileSelect, orderBy: [{ kind: "asc" }, { voiceId: "asc" }] });
  return { question: q, files: rows.map(toFile) };
}

export async function searchAudioQuestionsAction(term: string) {
  await requireAdmin();
  const t = term.trim();
  if (t.length < 2) return [];
  return prisma.question.findMany({ where: { ...publishedWhere, OR: [{ id: { contains: t } }, { text: { contains: t, mode: "insensitive" } }] }, select: { id: true, text: true, category: { select: { name: true } } }, take: 12 });
}

export async function randomSampleAction(): Promise<AudioFile[]> {
  await requireAdmin();
  const ids = await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM question_audio WHERE status = 'done' ORDER BY random() LIMIT 10`;
  const rows = await prisma.questionAudio.findMany({ where: { id: { in: ids.map((i) => i.id) } }, select: fileSelect });
  return rows.map(toFile);
}

export async function regenerateQuestionAudioAction(questionId: string): Promise<ActionResult<{ total: number }>> {
  const admin = await requireAdmin();
  const res = await enqueueAudio({ scope: "question", scopeId: questionId, voiceMode: "both", kinds: ["question", "answer"], force: true, startedBy: admin.id });
  const o = await origin();
  if (res.total) after(() => triggerAudioWorker(o));
  return { ok: true, data: { total: res.total } };
}

/** Eigene Aufnahme hochladen (hat Vorrang vor TTS). */
export async function uploadAudioOverrideAction(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const questionId = z.string().min(1).max(64).parse(formData.get("questionId"));
  const kind = kindSchema.parse(formData.get("kind")) as AudioKind;
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Bitte eine MP3-Datei auswählen." };
  if (file.size > 8_000_000) return { ok: false, error: "Die Datei ist zu groß (max. 8 MB)." };
  if (!/mpeg|mp3/.test(file.type) && !file.name.endsWith(".mp3")) return { ok: false, error: "Bitte eine MP3-Datei hochladen." };
  if (!storageMode()) return { ok: false, error: "Speicher nicht eingerichtet." };
  const cfg = await getAudioConfig();
  const voiceId = z.string().min(1).max(80).catch(cfg.defaultVoiceId).parse(formData.get("voiceId"));
  const buf = Buffer.from(await file.arrayBuffer());
  const path = `${voiceId}/${questionId}_${kind}_upload-${Date.now().toString(36)}.mp3`;
  await uploadAudioFile(path, buf, "audio/mpeg");
  await prisma.questionAudio.upsert({
    where: { questionId_kind_voiceId: { questionId, kind, voiceId } },
    create: { questionId, kind, voiceId, source: "upload", status: "done", storagePathMp3: path, durationMs: mp3DurationMs(buf), textHash: "upload" },
    update: { source: "upload", status: "done", storagePathMp3: path, storagePathOpus: null, durationMs: mp3DurationMs(buf), textHash: "upload", error: null },
  });
  return { ok: true, data: undefined, message: "Aufnahme gespeichert – sie hat Vorrang vor der Computerstimme." };
}

export async function removeAudioOverrideAction(id: string): Promise<void> {
  await requireAdmin();
  await prisma.questionAudio.updateMany({ where: { id, source: "upload" }, data: { source: "tts", status: "pending", textHash: null } });
}

export async function audioKinds(): Promise<AudioKind[]> {
  return AUDIO_KINDS;
}
