import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { categoryColor, categoryIcon } from "@/components/category-style";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { PageHeader } from "@/components/page-header";
import { Progress } from "@/components/ui/progress";
import { requireUser } from "@/lib/auth/session";
import { getCategoryOverview } from "@/server/stats";

export const metadata: Metadata = { title: "Lernen" };

export default async function LernenPage() {
  const user = await requireUser();
  const categories = await getCategoryOverview(user.id);
  return (
    <div>
      <PageHeader eyebrow="Lernmodus" title="Lernkategorien" description="Wähle eine Kategorie. Im Lernmodus gibt es kein Zeitlimit, sofortiges Feedback und ausführliche Erklärungen." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((c, i) => {
          const color = categoryColor(c.color);
          const Icon = categoryIcon(c.icon);
          return (
            <Link
              key={c.id}
              href={`/lernen/${c.slug}`}
              className="group animate-pop-in flex flex-col overflow-hidden rounded-2xl glass glow-hover"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className={`relative panel-night p-5 text-white`}>
                <div className="absolute -right-8 -bottom-8 size-28 rounded-full blur-2xl" style={{ background: `${color.hex}55` }} />
                <div className="flex items-start justify-between">
                  <span className="flex size-11 items-center justify-center rounded-xl" style={{ background: `${color.hex}2e`, color: color.hex }}>
                    <Icon className="size-6" />
                  </span>
                  <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold backdrop-blur">{c.order}</span>
                </div>
                <h2 className="mt-4 text-lg leading-snug font-extrabold">{c.name}</h2>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-5">
                <p className="line-clamp-2 text-sm text-muted-foreground">{c.shortDescription}</p>
                <div className="mt-auto flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-navy">{c.questionCount} Fragen</span>
                  <DifficultyBadge difficulty={c.difficulty} />
                  {!c.syllabusVerified && (
                    <span className="inline-flex items-center gap-1 text-warning" title="Prüfungsstoff noch nicht mit offiziellen Vorgaben abgeglichen">
                      <ShieldAlert className="size-3.5" /> Stoff unverifiziert
                    </span>
                  )}
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">Fortschritt</span>
                    <span className={color.text}>{c.progress}%</span>
                  </div>
                  <Progress value={c.progress} barClassName={`bg-gradient-to-r ${color.gradient}`} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
