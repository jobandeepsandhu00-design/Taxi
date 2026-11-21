"use client";

import { FileUp, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { importQuestionsCsvAction, type ImportSummary } from "@/server/actions/admin";

export function ImportForm() {
  const [content, setContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function onFile(file: File) {
    setSummary(null);
    setError(null);
    if (file.size > 5_000_000) {
      setError("Die Datei ist zu groß (max. 5 MB).");
      return;
    }
    setFileName(file.name);
    if (/\.xlsx$/i.test(file.name)) {
      // Excel: erstes Blatt im Browser in CSV umwandeln
      try {
        const [{ readSheet }, Papa] = await Promise.all([import("read-excel-file/browser"), import("papaparse")]);
        const rows = await readSheet(file);
        setContent(Papa.default.unparse(rows.map((r) => r.map((c) => (c == null ? "" : c instanceof Date ? c.toISOString().slice(0, 10) : String(c))))));
      } catch {
        setError("Die Excel-Datei konnte nicht gelesen werden.");
      }
      return;
    }
    setContent(await file.text());
  }

  function exec(dryRun: boolean) {
    if (!content) return;
    start(async () => {
      const res = await importQuestionsCsvAction(content, dryRun);
      if (!res.ok) setError(res.error);
      else {
        setError(null);
        setSummary(res.data);
        if (!dryRun) setContent(null);
      }
    });
  }

  return (
    <Card>
      <CardHeader><CardTitle>CSV-/Excel-Import</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center hover:border-primary">
          <FileUp className="size-8 text-link" />
          <span className="font-semibold text-navy">{fileName || "CSV- oder Excel-Datei (.xlsx) auswählen"}</span>
          <span className="text-xs text-muted-foreground">Zuerst wird eine Prüfung (Probelauf) durchgeführt – erst danach wird importiert.</span>
          <input type="file" accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
        {error && <Alert variant="error">{error}</Alert>}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!content || pending} onClick={() => exec(true)}>
            {pending ? <Loader2 className="animate-spin" /> : null} Datei prüfen (Probelauf)
          </Button>
          <Button disabled={!content || pending || !summary?.dryRun || summary.created + summary.updated === 0} onClick={() => exec(false)}>
            Jetzt importieren
          </Button>
        </div>
        {summary && (
          <div className="space-y-3">
            <Alert variant={summary.errors.length ? "warning" : "success"} title={summary.dryRun ? "Ergebnis des Probelaufs" : "Import abgeschlossen"}>
              {summary.created} neue Fragen · {summary.updated} Aktualisierungen · {summary.errors.length} fehlerhafte Zeilen
              {summary.dryRun && summary.created + summary.updated > 0 && <p>Fehlerhafte Zeilen werden beim Import übersprungen.</p>}
            </Alert>
            {summary.errors.length > 0 && (
              <div className="max-h-64 overflow-y-auto rounded-xl border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted text-left"><tr><th className="p-2">Zeile</th><th className="p-2">Fehler</th></tr></thead>
                  <tbody className="divide-y">
                    {summary.errors.map((e, i) => (
                      <tr key={i}><td className="p-2 font-semibold">{e.rowNumber}</td><td className="p-2 text-destructive">{e.message}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
