import type { Metadata } from "next";
import { Download, FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CSV_HEADERS } from "@/lib/csv";
import { prisma } from "@/lib/db";
import { ImportForm } from "./import-form";

export const metadata: Metadata = { title: "Import / Export" };

export default async function ImportPage() {
  const categories = await prisma.category.findMany({ orderBy: { order: "asc" }, select: { slug: true, name: true } });
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Administration" title="Import & Export" description="Fragen per CSV-Datei massenhaft importieren oder den gesamten Katalog exportieren." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2"><ImportForm /></div>
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Export</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Button asChild className="w-full"><a href="/api/admin/export"><Download /> Alle Fragen (CSV)</a></Button>
              <Button asChild variant="outline" className="w-full"><a href="/api/admin/export?status=PUBLISHED"><Download /> Nur veröffentlichte</a></Button>
              <Button asChild variant="ghost" className="w-full"><a href="/api/admin/template"><FileSpreadsheet /> CSV-Vorlage herunterladen</a></Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Kategorie-Slugs</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-1 text-xs">
                {categories.map((c) => (
                  <li key={c.slug} className="flex justify-between gap-2"><code className="rounded bg-muted px-1.5 py-0.5 font-semibold">{c.slug}</code><span className="truncate text-muted-foreground">{c.name}</span></li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>CSV-Format</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-foreground/85">
          <p>UTF-8, Trennzeichen <code>;</code> oder <code>,</code>, erste Zeile = Spaltennamen. Pflichtspalten: <code>kategorie, frage, antwort_a–d, richtig, erklaerung</code>.</p>
          <p className="rounded-xl bg-muted p-3 font-mono text-xs break-all">{CSV_HEADERS.join(";")}</p>
          <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            <li><code>richtig</code>: Buchstabe(n) der richtigen Antwort(en), z. B. <code>B</code> oder <code>A,C</code> (mehrere = Mehrfachauswahl).</li>
            <li><code>schwierigkeit</code>: LEICHT, MITTEL, SCHWER · <code>status</code>: ENTWURF, VEROEFFENTLICHT, ARCHIVIERT · <code>herkunft</code>: UEBUNG, DEMO, OFFIZIELL.</li>
            <li><code>id</code> leer = neue Frage; bestehende ID = Frage wird aktualisiert (z. B. nach Export & Bearbeitung).</li>
            <li><code>thema</code>: wird automatisch angelegt, falls nicht vorhanden. <code>tags</code>: mit <code>|</code> getrennt.</li>
            <li>OFFIZIELL ist nur mit einer bereits angelegten, verifizierten Quelle (Spalte <code>quelle</code> = exakter Titel) möglich.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
