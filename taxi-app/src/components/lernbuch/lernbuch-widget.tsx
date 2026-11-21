import Link from "next/link";
import { ArrowRight, Library, Repeat } from "lucide-react";
import { ProgressRing } from "@/components/ui/progress";
import type { LernbuchOverview } from "@/lib/lernbuch";

/** Dashboard-Widget: Lernbuch-Fortschritt + Weiterlesen. */
export function LernbuchWidget({ o }: { o: LernbuchOverview }) {
  const pct = o.total ? Math.round((o.read / o.total) * 100) : 0;
  const c = o.current;
  const href = c ? `/lernbuch/story/${c.slug}?pos=${Math.min(c.lastPosition, Math.max(0, c.total - 1))}` : "/lernbuch";
  return (
    <section className="glass rounded-3xl p-4" data-testid="home-lernbuch" aria-label="Lernbuch">
      <div className="flex items-center gap-4">
        <ProgressRing value={pct} size={64} stroke={7} label={`${pct} % gelesen`}>
          <span className="text-sm font-extrabold text-navy">{pct}%</span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-link uppercase">
            <Library className="size-3.5" /> Lernbuch
          </p>
          <p className="truncate font-display text-base font-bold text-navy">{c ? (c.state === "neu" ? `Starte: ${c.title}` : `Weiterlesen: ${c.title}`) : "Alles gelesen – stark!"}</p>
          <p className="text-xs text-muted-foreground">
            {o.read}/{o.total} Karten · {o.checksPassed} {o.checksPassed === 1 ? "Check" : "Checks"} bestanden
          </p>
        </div>
        <Link href={href} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground" aria-label={c ? `Weiterlesen: ${c.title}` : "Zum Lernbuch"}>
          <ArrowRight className="size-5" />
        </Link>
      </div>
      {o.dueAgain > 0 && (
        <Link href="/lernbuch/story/wiederholung" className="mt-3 flex items-center gap-2 rounded-xl bg-warning/10 px-3 py-2 text-sm font-semibold text-warning">
          <Repeat className="size-4" /> {o.dueAgain} {o.dueAgain === 1 ? "Karte" : "Karten"} zum Wiederholen
        </Link>
      )}
    </section>
  );
}
