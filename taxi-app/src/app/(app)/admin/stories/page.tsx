import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";
import { DEFAULT_RING } from "@/lib/stories";
import { resolveDbSlides } from "@/server/stories/daily";
import { objectPublicUrl } from "@/server/storage";
import { StoriesAdmin, type AdminGroup } from "./stories-admin";

export const metadata: Metadata = { title: "Stories" };

export default async function StoriesAdminPage() {
  const since = new Date(Date.now() - 7 * 86400_000);
  const [groups, events, views] = await Promise.all([
    prisma.storyGroup.findMany({ orderBy: { sort: "asc" }, include: { slides: { orderBy: { sort: "asc" } } } }),
    prisma.storyEvent.groupBy({ by: ["groupKey", "kind", "correct"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.storyView.findMany({ where: { viewedAt: { gte: since } }, select: { slideId: true, userId: true } }),
  ]);
  const data: AdminGroup[] = await Promise.all(
    groups.map(async (g) => {
      const ids = new Set(g.slides.map((s) => s.id));
      const mine = views.filter((v) => ids.has(v.slideId) || v.slideId.startsWith(`${g.key}:`));
      const ev = (kind: string, correct?: boolean) => events.filter((e) => e.groupKey === g.key && e.kind === kind && (correct === undefined || e.correct === correct)).reduce((a, e) => a + e._count._all, 0);
      const viewers = new Set(mine.map((v) => v.userId)).size;
      const quizTotal = ev("quiz");
      const resolved = await resolveDbSlides(g.slides);
      return {
        id: g.id,
        key: g.key,
        titleDe: g.titleDe,
        iconImage: g.iconImage ?? "",
        type: g.type,
        isPersonal: g.isPersonal,
        sort: g.sort,
        ringColors: Array.isArray(g.ringColors) ? (g.ringColors as string[]) : DEFAULT_RING,
        activeFrom: g.activeFrom?.toISOString().slice(0, 16) ?? "",
        activeTo: g.activeTo?.toISOString().slice(0, 16) ?? "",
        stats: { views: mine.length, viewers, completes: ev("complete"), completionRate: viewers ? Math.round((100 * Math.min(ev("complete"), viewers)) / viewers) : null, cta: ev("cta"), quizTotal, quizAccuracy: quizTotal ? Math.round((100 * ev("quiz", true)) / quizTotal) : null },
        slides: g.slides.map((s, i) => ({
          id: s.id,
          sort: s.sort,
          titleDe: s.titleDe,
          bodyDe: s.bodyDe,
          emoji: s.emoji ?? "",
          bgColor: s.bgColor ?? "",
          durationMs: s.durationMs,
          ctaLabel: (s.cta as { label?: string } | null)?.label ?? "",
          ctaRoute: (s.cta as { route?: string } | null)?.route ?? "",
          quizQuestionId: (s.quiz as { question_id?: string } | null)?.question_id ?? "",
          mapLat: String((s.map as { lat?: number } | null)?.lat ?? ""),
          mapLng: String((s.map as { lng?: number } | null)?.lng ?? ""),
          mapLabel: (s.map as { label?: string } | null)?.label ?? "",
          imageUrl: s.imagePath ? objectPublicUrl("stories", s.imagePath) : null,
          imageCredit: s.imageCredit ?? "",
          verified: s.verified,
          views: views.filter((v) => v.slideId === s.id).length,
          preview: resolved[i]!,
        })),
      };
    }),
  );
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Stories"
        description="Gruppen und Slides für die Story-Leiste auf der Startseite. Tipp, Wien-Ort, Regel und Zahl werden täglich um 05:00 automatisch gewählt; Toni, Woche und Erfolge sind persönlich und werden live erzeugt."
      />
      <StoriesAdmin groups={data} />
    </div>
  );
}
