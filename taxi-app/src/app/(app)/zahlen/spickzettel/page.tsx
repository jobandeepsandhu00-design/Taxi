import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Circle, Lock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";
import { cheatSheet } from "@/server/numbers";

export const metadata: Metadata = { title: "Zahlen-Spickzettel" };

export default async function CheatSheetPage() {
  const user = await requireUser();
  const s = await cheatSheet(user.id);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/zahlen" className="inline-flex min-h-11 items-center text-sm font-semibold text-muted-foreground hover:text-navy">
        ← Zahlen-Trainer
      </Link>
      <PageHeader title="Zahlen-Spickzettel" description="Alle geprüften Zahlen auf einen Blick – eine Zahl erscheint erst, wenn du sie einmal geübt hast (aktives Erinnern wirkt besser)." />
      {s.groups.length === 0 && <p className="glass rounded-2xl p-5 text-sm text-muted-foreground">Noch leer. Übe ein paar Zahlen, dann füllt sich dein Spickzettel.</p>}
      {s.groups.map((g) => (
        <section key={g.category} className="glass rounded-2xl p-5">
          <h2 className="mb-3 font-bold text-navy">{g.category}</h2>
          <ul className="space-y-2">
            {g.items.map((f) => (
              <li key={f.id} className="flex items-start gap-2 text-sm">
                {f.mastered ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-label="gemeistert" /> : <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label="noch nicht gemeistert" />}
                <span>
                  {f.text}
                  {f.legalReference && <span className="block text-xs text-muted-foreground">{f.legalReference}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {(s.hiddenUnpracticed > 0 || s.unverified > 0) && (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Lock className="mt-0.5 size-3.5 shrink-0" />
          {s.hiddenUnpracticed > 0 ? `${s.hiddenUnpracticed} Zahlen erscheinen, sobald du sie geübt hast. ` : ""}
          {s.unverified > 0 ? `${s.unverified} Zahlen sind noch ungeprüft und erscheinen nach der Prüfung durch das Team.` : ""}
        </p>
      )}
    </div>
  );
}
