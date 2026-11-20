import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { coachQuota } from "@/server/coach/limits";
import { coachConfigured } from "@/server/coach/llm";
import { CoachChat, type ChatItem } from "./coach-chat";

export const metadata: Metadata = { title: "Dein Taxi-Coach" };

export default async function CoachPage() {
  const user = await requireUser();
  const [history, quota, recent] = await Promise.all([
    prisma.coachMessage.findMany({ where: { userId: user.id, kind: "chat" }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, role: true, content: true, citations: true, feedback: true } }),
    coachQuota(user),
    prisma.userAnswer.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20, select: { isCorrect: true } }),
  ]);
  const acc = recent.length ? recent.filter((r) => r.isCorrect).length / recent.length : null;
  const items: ChatItem[] = history.reverse().map((m) => ({
    id: m.id,
    role: m.role === "assistant" ? "assistant" : "user",
    text: m.content,
    citations: (m.citations as ChatItem["citations"]) ?? [],
    feedback: (m.feedback as 1 | -1 | null) ?? null,
  }));
  return (
    <CoachChat
      enabled={coachConfigured()}
      initial={items}
      remaining={quota.unlimited ? null : quota.remaining}
      limit={quota.limit}
      name={user.isGuest ? "Gast" : user.name.split(" ")[0]}
      mood={acc === null ? "idle" : acc >= 0.75 ? "happy" : acc < 0.45 ? "sad" : "idle"}
    />
  );
}
