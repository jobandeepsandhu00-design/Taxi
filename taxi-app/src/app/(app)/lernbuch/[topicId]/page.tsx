import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Clock } from "lucide-react";
import { categoryColor } from "@/components/category-style";
import { ChapterStateBadge } from "@/components/lernbuch/state-badge";
import { PageHeader } from "@/components/page-header";
import { Progress } from "@/components/ui/progress";
import { requireUser } from "@/lib/auth/session";
import { getLernbuchOverview } from "@/server/lernbuch";

export const metadata: Metadata = { title: "Lernbuch – Thema" };

export default async function TopicPage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params;
  const user = await requireUser();
  const o = await getLernbuchOverview(user.id);
  const topic = o.topics.find((t) => t.id === topicId);
  if (!topic) notFound();
  const color = categoryColor(topic.color);
  return (
    <div>
      <Link href="/lernbuch" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-link">
        <ChevronLeft className="size-4" /> Lernbuch
      </Link>
      <PageHeader eyebrow="Thema" title={topic.title} description={topic.description} />
      <ol className="space-y-3">
        {topic.chapters.map((c) => {
          const p = c.total ? Math.round((c.read / c.total) * 100) : 0;
          return (
            <li key={c.id}>
              <Link href={`/lernbuch/${topic.id}/${c.slug}`} className="glass glow-hover flex items-center gap-4 rounded-2xl p-4" data-testid={`chapter-${c.slug}`}>
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold" style={{ background: `${color.hex}22`, color: color.hex }}>
                  {c.order}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold text-navy">{c.title}</span>
                    <ChapterStateBadge state={c.state} />
                  </span>
                  <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    {c.read}/{c.total} Karten <Clock className="size-3" aria-hidden /> ca. {c.estMinutes} Min.
                  </span>
                  <Progress value={p} className="mt-2 h-1.5" barClassName={`bg-gradient-to-r ${color.gradient}`} />
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
