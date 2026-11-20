import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Crown, Route as RouteIcon } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth/session";
import { listRoutes } from "@/server/routes";

export const metadata: Metadata = { title: "Routen in Etappen" };

export default async function RoutesPage() {
  const user = await requireUser();
  const routes = await listRoutes(user.id);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Wiener Ortskunde" title="Routen in Etappen" description="Lange Routen Schritt für Schritt lernen: erst anschauen, dann Lücken füllen, am Ende die ganze Route selbst ordnen." />
      <ul className="space-y-3">
        {routes.map((r) => (
          <li key={r.id}>
            <Link href={`/ortskunde/routen/${r.slug}`} className="glass glow-hover flex min-h-20 items-center gap-4 rounded-2xl p-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">{r.mastered ? <Crown className="size-6" /> : <RouteIcon className="size-6" />}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-navy">
                  {r.fromName} → {r.toName}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {r.streetCount} Straßen · {r.stageCount > 0 ? `${r.stageCount} Etappen + ganze Route` : "ohne Etappen"}
                  {!r.verified && " · Ungeprüft"}
                </span>
                <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.round(r.progress * 100)}%` }} />
                </span>
              </span>
              <ArrowRight className="size-5 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
