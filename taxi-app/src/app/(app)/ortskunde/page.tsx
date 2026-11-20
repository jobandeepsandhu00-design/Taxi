import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { OrtskundeTrainer } from "./trainer";

export const metadata: Metadata = { title: "Ortskunde-Karte" };

export default function OrtskundePage() {
  return (
    <div className="space-y-2">
      <PageHeader
        eyebrow="Wiener Ortskunde"
        title="Ortskunde-Karte"
        description="Finde Sehenswürdigkeiten, Bahnhöfe, Spitäler und Bezirke auf der Karte – und trainiere Routen über die Ringstraße. Die Karte ist bewusst ohne Beschriftung."
      />
      <Link href="/ortskunde/routen" className="glass glow-hover mb-4 flex min-h-14 items-center gap-3 rounded-2xl p-4 text-sm">
        <span className="text-xl" aria-hidden>🛣️</span>
        <span className="flex-1">
          <span className="block font-bold text-navy">Neu: Routen in Etappen</span>
          <span className="block text-xs text-muted-foreground">Lange Routen Schritt für Schritt – mit Lückentext und Drag &amp; Drop.</span>
        </span>
      </Link>
      <OrtskundeTrainer />
    </div>
  );
}
