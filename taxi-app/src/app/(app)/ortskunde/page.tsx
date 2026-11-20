import type { Metadata } from "next";
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
      <OrtskundeTrainer />
    </div>
  );
}
