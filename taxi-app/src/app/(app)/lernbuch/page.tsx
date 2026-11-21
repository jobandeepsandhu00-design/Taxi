import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, CheckCircle2, Library, Repeat } from "lucide-react";
import { categoryColor, categoryIcon } from "@/components/category-style";
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
  return (
    <div>
      <PageHeader eyebrow="Lernbuch" title="Erst lernen, dann üben" description="Lies jede Frage mit der richtigen Antwort aus dem Skript – Karte für Karte. Danach bestätigst du dein Wissen mit dem Kapitel-Check." />

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
          href={`/lernbuch/story/${current.slug}?pos=${Math.min(current.lastPosition, Math.max(0, current.total - 1))}`}
          className="panel-night glow-hover mb-6 flex items-center gap-4 rounded-2xl p-5 text-white"
          data-testid="lernbuch-continue"
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/15"><Library className="size-6" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-bold tracking-wider text-white/70 uppercase">{current.state === "neu" ? "Jetzt beginnen" : "Weiterlesen"}</span>
            <span className="block truncate text-lg font-extrabold">{current.title}</span>
            <span className="block text-xs text-white/70">
              Karte {Math.min(current.lastPosition + 1, current.total)} von {current.total} · ca. {current.estMinutes} Min.
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

      <h2 className="mb-3 text-lg font-extrabold text-navy">Themen</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {o.topics.map((t, i) => {
          const color = categoryColor(t.color);
          const Icon = categoryIcon(t.icon);
          const p = t.total ? Math.round((t.read / t.total) * 100) : 0;
          return (
            <Link key={t.id} href={`/lernbuch/${t.id}`} className="glass glow-hover animate-pop-in flex flex-col gap-3 rounded-2xl p-5" style={{ animationDelay: `${i * 30}ms` }}>
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl" style={{ background: `${color.hex}22`, color: color.hex }}>
                  <Icon className="size-6" />
                </span>
                <div className="min-w-0">
                  <h3 className="leading-snug font-extrabold text-navy">{t.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {t.chapters.length} Kapitel · {t.total} Karten
                  </p>
                </div>
              </div>
              <p className="line-clamp-2 text-sm text-muted-foreground">{t.description}</p>
              <div className="mt-auto">
                <div className="mb-1 flex justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">{t.read} gelesen</span>
                  <span className={color.text}>{p}%</span>
                </div>
                <Progress value={p} barClassName={`bg-gradient-to-r ${color.gradient}`} />
              </div>
            </Link>
          );
        })}
      </div>
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
