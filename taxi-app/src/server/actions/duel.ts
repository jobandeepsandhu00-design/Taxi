"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { avatarEmoji } from "@/lib/avatars";
import { duelCode, duelWinner, publicName } from "@/lib/challenge";
import { prisma } from "@/lib/db";
import { gradeAnswer, pickRandomUnique } from "@/lib/quiz-logic";
import { rewardXp } from "@/server/gamification";
import { getAnswerKey, getPublicQuestions, publishedWhere, type PublicQuestion } from "@/server/questions";

const DUEL_QUESTIONS = 5;
const INTRO_MS = 4500;
const codeSchema = z.string().trim().toUpperCase().regex(/^[A-HJ-NP-Z2-9]{6}$/);

export async function createDuelAction() {
  const user = await requireUser();
  const pool = await prisma.question.findMany({ where: publishedWhere, select: { id: true } });
  const ids = pickRandomUnique(pool.map((p) => p.id), DUEL_QUESTIONS);
  let code = duelCode();
  for (let i = 0; i < 5 && (await prisma.duel.findUnique({ where: { code } })); i++) code = duelCode();
  await prisma.duel.create({ data: { code, hostId: user.id, questionIds: ids } });
  redirect(`/duell/${code}`);
}

export async function joinDuelAction(formData: FormData) {
  const user = await requireUser();
  const parsed = codeSchema.safeParse(formData.get("code"));
  if (!parsed.success) redirect("/duell?fehler=code");
  const code = parsed.data;
  const duel = await prisma.duel.findUnique({ where: { code } });
  if (!duel) redirect("/duell?fehler=code");
  if (duel.hostId !== user.id && duel.status === "WAITING" && !duel.guestId) {
    // Nur einer gewinnt das Beitreten (gleichzeitige Versuche)
    await prisma.duel.updateMany({
      where: { id: duel.id, status: "WAITING", guestId: null },
      data: { guestId: user.id, status: "ACTIVE", startedAt: new Date(Date.now() + INTRO_MS) },
    });
  }
  redirect(`/duell/${code}`);
}

export interface DuelPlayer {
  name: string;
  avatar: string;
  answered: number;
  correct: number;
  timeMs: number;
}

export interface DuelState {
  code: string;
  status: "WAITING" | "ACTIVE" | "FINISHED" | "CANCELLED";
  me: "host" | "guest" | null;
  host: DuelPlayer;
  guest: DuelPlayer | null;
  startsInMs: number | null;
  total: number;
  questions: PublicQuestion[] | null;
  myAnswers: { index: number; isCorrect: boolean }[];
  winner: "host" | "guest" | "draw" | null;
}

export async function getDuelStateAction(rawCode: string): Promise<DuelState | null> {
  const user = await requireUser();
  const code = codeSchema.safeParse(rawCode);
  if (!code.success) return null;
  const duel = await prisma.duel.findUnique({
    where: { code: code.data },
    include: {
      host: { select: { id: true, name: true, isGuest: true, avatar: true } },
      guest: { select: { id: true, name: true, isGuest: true, avatar: true } },
      answers: { select: { userId: true, index: true, isCorrect: true, timeMs: true } },
    },
  });
  if (!duel) return null;
  const me = duel.hostId === user.id ? "host" : duel.guestId === user.id ? "guest" : null;
  const player = (u: { id: string; name: string; isGuest: boolean; avatar: string | null }): DuelPlayer => {
    const a = duel.answers.filter((x) => x.userId === u.id);
    return { name: publicName(u.name, u.isGuest), avatar: avatarEmoji(u.avatar) ?? "🚕", answered: a.length, correct: a.filter((x) => x.isCorrect).length, timeMs: a.reduce((s, x) => s + x.timeMs, 0) };
  };
  const host = player(duel.host);
  const guest = duel.guest ? player(duel.guest) : null;
  const w = duel.status === "FINISHED" && guest ? duelWinner(host, guest) : undefined;
  return {
    code: duel.code,
    status: duel.status,
    me,
    host,
    guest,
    startsInMs: duel.startedAt ? Math.max(0, duel.startedAt.getTime() - Date.now()) : null,
    total: duel.questionIds.length,
    questions: me && duel.status !== "WAITING" ? await getPublicQuestions(duel.questionIds) : null,
    myAnswers: duel.answers.filter((a) => a.userId === user.id).map((a) => ({ index: a.index, isCorrect: a.isCorrect })),
    winner: w === undefined ? null : w === "a" ? "host" : w === "b" ? "guest" : "draw",
  };
}

export async function submitDuelAnswerAction(input: { code: string; index: number; selectedOptionIds: string[]; timeMs: number }): Promise<{ isCorrect: boolean; correctOptionIds: string[] } | { error: string }> {
  const user = await requireUser();
  const code = codeSchema.parse(input.code);
  const duel = await prisma.duel.findUnique({ where: { code } });
  if (!duel || duel.status !== "ACTIVE" || (duel.hostId !== user.id && duel.guestId !== user.id)) return { error: "Duell nicht aktiv." };
  if (duel.startedAt && duel.startedAt.getTime() > Date.now() + 500) return { error: "Das Duell hat noch nicht begonnen." };
  const index = z.number().int().min(0).max(duel.questionIds.length - 1).parse(input.index);
  const key = await getAnswerKey(duel.questionIds[index]);
  if (!key) return { error: "Frage nicht gefunden." };
  const correctIds = key.options.filter((o) => o.isCorrect).map((o) => o.id);
  const valid = new Set(key.options.map((o) => o.id));
  const selected = input.selectedOptionIds.filter((id) => valid.has(id));
  const isCorrect = gradeAnswer(selected, correctIds);
  const timeMs = Math.min(Math.max(0, Math.round(input.timeMs)), 120_000);
  const existing = await prisma.duelAnswer.findUnique({ where: { duelId_userId_index: { duelId: duel.id, userId: user.id, index } } });
  if (!existing) await prisma.duelAnswer.create({ data: { duelId: duel.id, userId: user.id, index, isCorrect, timeMs } });

  // Beide fertig → Duell abschließen und Belohnung vergeben (nur einmal)
  const count = await prisma.duelAnswer.count({ where: { duelId: duel.id } });
  if (count >= duel.questionIds.length * 2) {
    const closed = await prisma.duel.updateMany({ where: { id: duel.id, status: "ACTIVE" }, data: { status: "FINISHED", finishedAt: new Date() } });
    if (closed.count === 1 && duel.guestId) {
      const answers = await prisma.duelAnswer.findMany({ where: { duelId: duel.id } });
      const sum = (uid: string) => ({ correct: answers.filter((a) => a.userId === uid && a.isCorrect).length, timeMs: answers.filter((a) => a.userId === uid).reduce((s, a) => s + a.timeMs, 0) });
      const w = duelWinner(sum(duel.hostId), sum(duel.guestId));
      await rewardXp(duel.hostId, w === "a" ? 30 : 15).catch(() => null);
      await rewardXp(duel.guestId, w === "b" ? 30 : 15).catch(() => null);
    }
  }
  return { isCorrect: existing ? existing.isCorrect : isCorrect, correctOptionIds: correctIds };
}

export async function cancelDuelAction(rawCode: string) {
  const user = await requireUser();
  const code = codeSchema.parse(rawCode);
  await prisma.duel.updateMany({ where: { code, hostId: user.id, status: "WAITING" }, data: { status: "CANCELLED" } });
  redirect("/duell");
}
