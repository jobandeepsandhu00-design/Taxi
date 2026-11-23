import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, CheckCircle2, Library, Repeat } from "lucide-react";
import { categoryColor } from "@/components/category-style";
import { ChapterStateBadge } from "@/components/lernbuch/state-badge";
import { SECTION_SIZE, sectionCount } from "@/lib/lernbuch";
import { PageHeader } from "@/components/page-header";
import { Progress, ProgressRing } from "@/components/ui/progress";
import { requireUser } from "@/lib/auth/session";
import { getLernbuchOverview } from "@/server/lernbuch";

export const metadata: Metadata = { title: "Lernbuch" };

export default async function LernbuchPage() {
  const user = await requireUser();
  const o = await getLernbuchOverview(user.id);
  const pct = o.total ? Math.round((o.read / o.total) * 100) : 0;
  const current = o.current;
  const currentTopic = current ? o.topics.find((t) => t.id === current.topicId) : null;
  const chapters = o.topics.flatMap((t) => t.chapters).sort((a, b) => a.order - b.order);
  return (
    <div>
      <PageHeader eyebrow="Lernbuch" title="Erst lernen, dann üben" description="Lies jede Frage mit der richtigen Antwort aus dem Skript – Karte für Karte. Danach bestätigst du dein Wissen mit dem Kapitel-Check." action={<Link href="/lernbuch/eigene" className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-link" data-testid="lernbuch-my-link">✏️ Meine Fragen & Kapitel</Link>} />

      <section className="glass mb-6 grid gap-5 rounded-2xl p-5 sm:grid-cols-[auto_1fr] sm:items-center sm:p-6" aria-label="Lernbuch-Fortschritt">
        <ProgressRing value={pct} size={112} label={`${pct} % gelesen`}>
          <span className="text-2xl font-extrabold text-navy">{pct}%</span>
          <span className="text-[11px] font-semibold text-muted-foreground">gelesen</span>
        </ProgressRing>
        <div className="grid grid-cols-3 gap-3 text-center sm:text-left">
          <Stat icon={<BookOpenCheck className="size-4" />} value={`${o.read}/${o.total}`} label="Karten gelesen" />
          <Stat icon={<CheckCircle2 className="size-4" />} value={String(o.checksPassed)} label="Checks bestanden" />
          <Stat icon={<Repeat className="size-4" />} value={String(o.dueAgain)} label="Nochmal fällig" />
        </div>
      </section>

      {current && currentTopic && (
        <Link
          href={continueHref(current.slug, current.lastPosition, current.total)}
          className="panel-night glow-hover mb-6 flex items-center gap-4 rounded-2xl p-5 text-white"
          data-testid="lernbuch-continue"
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/15"><Library className="size-6" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-bold tracking-wider text-white/70 uppercase">{current.state === "neu" ? "Jetzt beginnen" : "Weiterlesen"}</span>
            <span className="block truncate text-lg font-extrabold">{current.title}</span>
            <span className="block text-xs text-white/70">
              Kapitel {current.order} · Abschnitt {Math.floor(Math.min(current.lastPosition, current.total - 1) / SECTION_SIZE) + 1} von {sectionCount(current.total)} · Frage {Math.min(current.lastPosition + 1, current.total)} von {current.total}
            </span>
          </span>
          <ArrowRight className="size-6 shrink-0" />
        </Link>
      )}

      {o.dueAgain > 0 && (
        <Link href="/lernbuch/story/wiederholung" className="glass glow-hover mb-6 flex items-center gap-3 rounded-2xl p-4" data-testid="lernbuch-repeat">
          <Repeat className="size-5 text-primary" />
          <span className="flex-1 text-sm font-bold text-navy">{o.dueAgain} {o.dueAgain === 1 ? "Karte" : "Karten"} zum Wiederholen</span>
          <ArrowRight className="size-5 text-muted-foreground" />
        </Link>
      )}

      <h2 className="mb-3 text-lg font-extrabold text-navy">Kapitel</h2>
      <ol className="space-y-3" data-testid="lernbuch-chapters">
        {chapters.map((c, i) => {
          const topic = o.topics.find((t) => t.id === c.topicId)!;
          const color = categoryColor(topic.color);
          const p = c.total ? Math.round((c.read / c.total) * 100) : 0;
          const secs = sectionCount(c.total);
          return (
            <li key={c.id} className="animate-pop-in" style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
              <Link href={`/lernbuch/${c.topicId}/${c.slug}`} className="glass glow-hover flex items-center gap-4 rounded-2xl p-4" data-testid={`chapter-${c.slug}`}>
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl text-base font-extrabold" style={{ background: `${color.hex}22`, color: color.hex }}>
                  {c.order}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="leading-snug font-extrabold text-navy">{c.title}</span>
                    {c.state !== "neu" && <ChapterStateBadge state={c.state} />}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {c.total} Fragen · {secs} {secs === 1 ? "Abschnitt" : "Abschnitte"} · {c.read} gelesen
                  </span>
                  <Progress value={p} className="mt-2 h-1.5" barClassName={`bg-gradient-to-r ${color.gradient}`} />
                </span>
                <ArrowRight className="size-5 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div>
      <div className="flex items-center justify-center gap-1.5 text-primary sm:justify-start">{icon}<span className="text-lg font-extrabold text-navy">{value}</span></div>
      <div className="text-[11px] font-semibold text-muted-foreground sm:text-xs">{label}</div>
    </div>
  );
}

/** Weiterlesen: Abschnitt der letzten Position (10 Fragen pro Abschnitt). */
function continueHref(slug: string, lastPosition: number, total: number) {
  const pos = Math.min(lastPosition, Math.max(0, total - 1));
  return `/lernbuch/story/${slug}?abschnitt=${Math.floor(pos / SECTION_SIZE) + 1}&pos=${pos % SECTION_SIZE}`;
}
