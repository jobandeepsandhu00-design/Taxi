import type { Metadata } from "next";
import Link from "next/link";
import { BookMarked, Hash, Keyboard, ListChecks, Zap } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";
import { numberStats } from "@/server/numbers";

export const metadata: Metadata = { title: "Zahlen-Trainer" };

const drills = [
  { href: "/zahlen/ueben?typ=auswahl", title: "Auswahl", desc: "Welcher Wert stimmt? 4 Möglichkeiten.", icon: ListChecks },
  { href: "/zahlen/ueben?typ=eingabe", title: "Eingabe", desc: "Zahl selbst eintippen und Einheit wählen.", icon: Keyboard },
  { href: "/zahlen/ueben?typ=blitz", title: "Blitz-Runde", desc: "60 Sekunden – stimmt das oder nicht?", icon: Zap },
];

export default async function NumbersPage() {
  const user = await requireUser();
  const s = await numberStats(user.id);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Lernen" title="Zahlen-Trainer" description="Promille, Abstände, Geschwindigkeiten, Fristen – die typischen Zahlenfallen der Prüfung. Nach dem Karteikasten-Prinzip." />
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: "geübt", value: `${s.practiced}/${s.total}` },
          { label: "gemeistert", value: s.mastered },
          { label: "heute fällig", value: s.due },
        ].map((k) => (
          <div key={k.label} className="glass rounded-2xl p-3">
            <p className="font-display text-2xl font-bold text-navy tabular">{k.value}</p>
            <p className="text-xs text-muted-foreground">{k.label}</p>
          </div>
        ))}
      </div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {drills.map((d) => (
          <li key={d.href}>
            <Link href={d.href} className="glass glow-hover flex h-full min-h-28 flex-col gap-2 rounded-2xl p-4">
              <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <d.icon className="size-5" />
              </span>
              <span className="font-display font-bold text-navy">{d.title}</span>
              <span className="text-sm text-muted-foreground">{d.desc}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/zahlen/spickzettel" className="glass glow-hover flex min-h-14 items-center gap-3 rounded-2xl p-4">
        <BookMarked className="size-5 text-link" />
        <span className="flex-1">
          <span className="block font-bold text-navy">Zahlen-Spickzettel</span>
          <span className="block text-xs text-muted-foreground">Erscheint Stück für Stück – nur Zahlen, die du schon geübt hast.</span>
        </span>
        <Hash className="size-4 text-muted-foreground" />
      </Link>
    </div>
  );
}
