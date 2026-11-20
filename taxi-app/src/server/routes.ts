import "server-only";
import { prisma } from "@/lib/db";
import { isMastered, routeUnits } from "@/lib/route-stages";

export interface RouteProgressView {
  stageIndex: number;
  level: number;
  mastered: boolean;
  fullCorrectDays: string[];
}

export async function listRoutes(userId: string) {
  const [routes, progress] = await Promise.all([
    prisma.route.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.routeProgress.findMany({ where: { userId } }),
  ]);
  return routes.map((r) => {
    const units = routeUnits(r.streets);
    const mine = progress.filter((p) => p.routeId === r.id);
    const doneLevels = units.reduce((s, u) => s + Math.min(4, mine.find((p) => p.stageIndex === u.stageIndex)?.level ?? 0), 0);
    const full = mine.find((p) => p.stageIndex === units.length - 1);
    return {
      id: r.id,
      slug: r.slug,
      fromName: r.fromName,
      toName: r.toName,
      streetCount: r.streets.length,
      stageCount: units.length - 1,
      verified: r.verified,
      progress: doneLevels / (units.length * 4),
      mastered: Boolean(full && isMastered(full.fullCorrectDays)),
    };
  });
}

export async function routeDetail(userId: string, slug: string) {
  const route = await prisma.route.findUnique({ where: { slug } });
  if (!route) return null;
  const [progress, others] = await Promise.all([
    prisma.routeProgress.findMany({ where: { userId, routeId: route.id } }),
    prisma.route.findMany({ where: { id: { not: route.id } }, select: { streets: true } }),
  ]);
  return {
    route: { id: route.id, slug: route.slug, fromName: route.fromName, toName: route.toName, streets: route.streets, path: route.path as [number, number][][], verified: route.verified },
    progress: progress.map((p) => ({ stageIndex: p.stageIndex, level: p.level, mastered: p.mastered, fullCorrectDays: p.fullCorrectDays })) as RouteProgressView[],
    /** Ablenker für Stufe 2 */
    otherStreets: Array.from(new Set(others.flatMap((o) => o.streets))).filter((s) => !route.streets.includes(s)),
  };
}
