import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { dayKey, dayKeyToDate } from "@/lib/dates";
import { nextLeitner } from "@/lib/gamification";
import {
  clampScore,
  coverageScore,
  fakeCoverage,
  ORAL_AUDIO_RETENTION_DAYS,
  ORAL_FREE_DAILY,
  parseFollowUps,
  parseKeyPoints,
  pickFollowUp,
  verdictFor,
  type KeyPoint,
  type OralVerdict,
} from "@/lib/oral";
import { coachFake, parseCoach } from "@/server/coach/llm";

/* ───────────── Limits ───────────── */

export async function oralAccess(user: { id: string; role: string }) {
  const u = await prisma.user.findUnique({ where: { id: user.id }, select: { isPremium: true, oralSaveAudio: true, oralPrivacyAck: true } });
  const unlimited = Boolean(u?.isPremium) || user.role === "ADMIN";
  const today = await prisma.oralAttempt.findMany({
    where: { userId: user.id, createdAt: { gte: dayKeyToDate(dayKey()) } },
    distinct: ["oralQuestionId"],
    select: { oralQuestionId: true },
  });
  const usedIds = today.map((t) => t.oralQuestionId);
  return {
    unlimited,
    canExam: unlimited,
    usedIds,
    used: usedIds.length,
    remaining: unlimited ? Infinity : Math.max(0, ORAL_FREE_DAILY - usedIds.length),
    saveAudio: u?.oralSaveAudio ?? true,
    privacyAck: Boolean(u?.oralPrivacyAck),
  };
}

export const ORAL_LIMIT_REACHED = `Du hast heute deine ${ORAL_FREE_DAILY} kostenlosen mündlichen Fragen geschafft. Morgen geht's weiter – mit Premium übst du unbegrenzt und bekommst den Prüfungsmodus.`;

/* ───────────── Spracherkennung ───────────── */

export function sttConfigured(): boolean {
  return coachFake() || Boolean(process.env.OPENAI_API_KEY);
}

const STT_PROMPT = "Mündliche Taxi-Prüfung Wien. Begriffe: StVO, KFG, GelverkG, Konzession, Taxameter, Rettungsgasse, Fundamt, Registrierkasse, Assistenzhund, Pannendreieck.";

/** Audio → deutscher Text (OpenAI Speech-to-Text). Im Testmodus wird die Musterantwort „gesprochen“. */
export async function transcribeAudio(file: File, fakeText: string): Promise<string> {
  if (coachFake()) return fakeText;
  const form = new FormData();
  form.append("file", file, file.name || "antwort.webm");
  form.append("model", process.env.STT_MODEL || "gpt-4o-mini-transcribe");
  form.append("language", "de");
  form.append("prompt", STT_PROMPT);
  form.append("response_format", "json");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`STT ${res.status}`);
  const json = (await res.json()) as { text?: string };
  return (json.text ?? "").trim();
}

/* ───────────── Speicher (Supabase Storage, privat) ───────────── */

const BUCKET = "oral-audio";

function storageEnv() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

export function storageConfigured(): boolean {
  return storageEnv() !== null;
}

export async function uploadAudio(userId: string, file: File): Promise<string | null> {
  const env = storageEnv();
  if (!env) return null;
  const ext = file.type.includes("mp4") ? "m4a" : file.type.includes("ogg") ? "ogg" : "webm";
  const path = `${userId}/${dayKey()}/${crypto.randomUUID()}.${ext}`;
  try {
    const res = await fetch(`${env.url}/storage/v1/object/${BUCKET}/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.key}`, apikey: env.key, "Content-Type": file.type || "audio/webm", "x-upsert": "false" },
      body: Buffer.from(await file.arrayBuffer()),
      signal: AbortSignal.timeout(20_000),
    });
    return res.ok ? path : null;
  } catch {
    return null;
  }
}

async function deleteAudio(paths: string[]): Promise<boolean> {
  const env = storageEnv();
  if (!env || paths.length === 0) return paths.length === 0;
  const res = await fetch(`${env.url}/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${env.key}`, apikey: env.key, "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: paths }),
  });
  return res.ok;
}

/** Aufnahmen älter als 30 Tage löschen (täglicher Cron). Das Transkript bleibt erhalten. */
export async function purgeOldAudio(): Promise<number> {
  const cutoff = new Date(Date.now() - ORAL_AUDIO_RETENTION_DAYS * 86_400_000);
  let purged = 0;
  for (;;) {
    const old = await prisma.oralAttempt.findMany({ where: { audioPath: { not: null }, createdAt: { lt: cutoff } }, select: { id: true, audioPath: true }, take: 500 });
    if (old.length === 0) break;
    const ok = await deleteAudio(old.map((o) => o.audioPath!));
    if (!ok && storageConfigured()) break;
    await prisma.oralAttempt.updateMany({ where: { id: { in: old.map((o) => o.id) } }, data: { audioPath: null } });
    purged += old.length;
    if (old.length < 500) break;
  }
  return purged;
}

/** Alle Aufnahmen einer Person löschen (wenn „Aufnahmen nicht speichern“ aktiviert wird). */
export async function purgeUserAudio(userId: string): Promise<void> {
  const rows = await prisma.oralAttempt.findMany({ where: { userId, audioPath: { not: null } }, select: { audioPath: true } });
  await deleteAudio(rows.map((r) => r.audioPath!)).catch(() => false);
  await prisma.oralAttempt.updateMany({ where: { userId, audioPath: { not: null } }, data: { audioPath: null } });
}

/* ───────────── Bewertung ───────────── */

const gradeSchema = z.object({
  covered_point_ids: z.array(z.string()),
  missing_point_ids: z.array(z.string()),
  wrong_statements: z.array(z.string()),
  score: z.number(),
  verdict: z.enum(["richtig", "teilweise", "falsch"]),
  feedback_de: z.string(),
  follow_up_question_de: z.string().nullable(),
});

export type OralGrade = {
  coveredPointIds: string[];
  missingPointIds: string[];
  score: number;
  verdict: OralVerdict;
  feedbackDe: string;
  followUpQuestion: string | null;
};

type QuestionForGrading = { questionDe: string; modelAnswerDe: string; keyPoints: unknown; followUps: unknown; legalReference: string | null };

function shortFeedback(s: string): string {
  const w = s.trim().split(/\s+/);
  return w.length <= 45 ? s.trim() : `${w.slice(0, 40).join(" ")} …`;
}

/** Antwort gegen Kernpunkte und Musterantwort bewerten. Die Regeln für das Urteil werden serverseitig erzwungen. */
export async function gradeOralAnswer(q: QuestionForGrading, answer: { transcript: string; followUpQuestion?: string | null; followUpTranscript?: string | null }): Promise<OralGrade | null> {
  const points = parseKeyPoints(q.keyPoints);
  const followUps = parseFollowUps(q.followUps);
  const combined = [answer.transcript, answer.followUpTranscript].filter(Boolean).join(" ");
  const pointList = points.map((p) => `- ${p.id}${p.required ? " (Pflicht)" : ""}: ${p.text}`).join("\n");

  const out = await parseCoach({
    context: `Du bist Prüfer:in bei der mündlichen Taxi-Prüfung in Wien. Bewerte ausschließlich gegen die Kernpunkte und die Musterantwort unten – kein anderes Wissen.
Frage: ${q.questionDe}
Musterantwort: ${q.modelAnswerDe}
Kernpunkte:
${pointList}${q.legalReference ? `\nRechtsquelle: ${q.legalReference}` : ""}

Regeln:
- Die Antwort ist ein automatisches Transkript gesprochener Sprache: akzeptiere Synonyme, Umschreibungen, Dialekt (Wienerisch), Grammatikfehler und Erkennungsfehler. Ein Kernpunkt gilt als genannt, wenn der Sinn klar getroffen ist.
- verdict: „richtig“ = alle Pflicht-Kernpunkte genannt und keine falschen Aussagen; „teilweise“ = manche Kernpunkte genannt; „falsch“ = keine Kernpunkte oder nur falsche Aussagen.
- wrong_statements: inhaltlich falsche Aussagen der Antwort (kurz), sonst leer. Erwähne sie im Feedback.
- score: 0–10.
- feedback_de: höchstens 40 Wörter, du-Form, freundlich, konkret: was gut war, was fehlt. Erfinde keine Gesetze, Paragraphen oder Zahlen, die nicht in der Musterantwort stehen.
- follow_up_question_de: wenn Pflicht-Kernpunkte fehlen, eine kurze Nachfrage wie in einer echten Prüfung, die auf den fehlenden Punkt zielt, ohne die Antwort zu verraten; sonst null.`,
    prompt: `Antwort (Transkript): „${answer.transcript}“${answer.followUpTranscript ? `\nNachfrage des Prüfers: „${answer.followUpQuestion ?? ""}“\nAntwort auf die Nachfrage: „${answer.followUpTranscript}“\nBewerte beide Antworten zusammen.` : ""}`,
    schema: gradeSchema,
    fake: () => {
      const covered = fakeCoverage(points, combined);
      const verdict = verdictFor(points, covered);
      return {
        covered_point_ids: covered,
        missing_point_ids: points.filter((p) => !covered.includes(p.id)).map((p) => p.id),
        wrong_statements: [],
        score: coverageScore(points, covered),
        verdict,
        feedback_de: verdict === "richtig" ? "Sehr gut – du hast alle wichtigen Punkte genannt." : verdict === "teilweise" ? "Guter Anfang, aber es fehlen noch wichtige Punkte." : "Das passt leider noch nicht. Schau dir die Musterantwort an.",
        follow_up_question_de: null,
      };
    },
    maxTokens: 2500,
  });
  if (!out) return null;

  const valid = new Set(points.map((p) => p.id));
  const covered = Array.from(new Set(out.covered_point_ids.filter((id) => valid.has(id))));
  const verdict = verdictFor(points, covered, out.wrong_statements.length);
  const score = clampScore(Number.isFinite(out.score) ? out.score : coverageScore(points, covered), verdict);
  const followUpQuestion = pickFollowUp(points, covered, followUps) ?? (verdict !== "richtig" ? out.follow_up_question_de : null);
  return {
    coveredPointIds: covered,
    missingPointIds: points.filter((p) => !covered.includes(p.id)).map((p) => p.id),
    score,
    verdict,
    feedbackDe: shortFeedback(out.feedback_de),
    followUpQuestion: followUpQuestion || null,
  };
}

/** Leitner-Kasten der mündlichen Frage fortschreiben (teilweise = Kasten bleibt). */
export async function updateOralProgress(userId: string, oralQuestionId: string, verdict: OralVerdict, score: number) {
  const cur = await prisma.oralProgress.findUnique({ where: { userId_oralQuestionId: { userId, oralQuestionId } } });
  const { box, days } = nextLeitner(cur?.box ?? null, verdict !== "falsch", verdict === "teilweise");
  const dueAt = new Date(Date.now() + days * 86_400_000);
  await prisma.oralProgress.upsert({
    where: { userId_oralQuestionId: { userId, oralQuestionId } },
    create: { userId, oralQuestionId, box, dueAt, lastScore: score, attempts: 1 },
    update: { box, dueAt, lastScore: score, attempts: { increment: 1 } },
  });
  return { box, previousBox: cur?.box ?? null };
}

export function keyPointsOf(q: { keyPoints: unknown }): KeyPoint[] {
  return parseKeyPoints(q.keyPoints);
}
