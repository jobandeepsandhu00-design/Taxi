"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { dayKey } from "@/lib/dates";
import { isMastered, routeUnits } from "@/lib/route-stages";
import { rewardXp } from "@/server/gamification";

const schema = z.object({ routeId: z.string().min(1).max(64), stageIndex: z.number().int().min(0).max(50), level: z.number().int().min(1).max(4) });

/** Stufe einer Etappe/Route abgeschlossen (nur korrekte Durchgänge werden gemeldet). */
export async function completeRouteLevelAction(input: z.infer<typeof schema>): Promise<{ ok: boolean; level: number; mastered: boolean; xp: number }> {
  const user = await requireUser();
  const p = schema.parse(input);
  const route = await prisma.route.findUnique({ where: { id: p.routeId }, select: { id: true, streets: true } });
  if (!route) return { ok: false, level: 0, mastered: false, xp: 0 };
  const units = routeUnits(route.streets);
  if (p.stageIndex >= units.length) return { ok: false, level: 0, mastered: false, xp: 0 };
  const fullIndex = units.length - 1;
  const cur = await prisma.routeProgress.findUnique({ where: { userId_routeId_stageIndex: { userId: user.id, routeId: route.id, stageIndex: p.stageIndex } } });
  // Reihenfolge erzwingen: nur die nächste Stufe (oder Wiederholung einer erledigten) zählt
  if (p.level > (cur?.level ?? 0) + 1) return { ok: false, level: cur?.level ?? 0, mastered: cur?.mastered ?? false, xp: 0 };
  const level = Math.max(cur?.level ?? 0, p.level);
  const days = p.stageIndex === fullIndex && p.level === 4 ? Array.from(new Set([...(cur?.fullCorrectDays ?? []), dayKey()])) : (cur?.fullCorrectDays ?? []);
  const mastered = p.stageIndex === fullIndex && isMastered(days);
  await prisma.routeProgress.upsert({
    where: { userId_routeId_stageIndex: { userId: user.id, routeId: route.id, stageIndex: p.stageIndex } },
    create: { userId: user.id, routeId: route.id, stageIndex: p.stageIndex, level, mastered, fullCorrectDays: days },
    update: { level, mastered, fullCorrectDays: days },
  });
  const firstTime = p.level > (cur?.level ?? 0);
  const r = firstTime ? await rewardXp(user.id, p.level * 5).catch(() => null) : null;
  return { ok: true, level, mastered, xp: r?.xpGained ?? 0 };
}
