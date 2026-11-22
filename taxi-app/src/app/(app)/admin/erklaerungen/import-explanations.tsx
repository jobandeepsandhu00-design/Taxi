"use client";

import { FileUp, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { importExplanationsAction, type ExplanationImportSummary } from "@/server/actions/admin-explanations";

export function ImportExplanations() {
  const [content, setContent] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [summary, setSummary] = useState<ExplanationImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (dryRun: boolean) =>
    content &&
    start(async () => {
      const r = await importExplanationsAction(content, dryRun);
      if (!r.ok) return setError(r.error);
      setError(null);
      setSummary(r.data);
      if (!dryRun) setContent(null);
    });
  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center hover:border-primary">
        <FileUp className="size-7 text-link" />
        <span className="font-semibold text-navy">{name || "CSV mit Erklärungen auswählen"}</span>
        <span className="text-xs text-muted-foreground">Spalten: question_id, explanation_de, mnemonic_de, simple_de</span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setName(f.name);
            setSummary(null);
            setContent(await f.text());
          }}
        />
      </label>
      {error && <Alert variant="error">{error}</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={!content || pending} onClick={() => run(true)}>
          {pending && <Loader2 className="animate-spin" />} Prüfen (Probelauf)
        </Button>
        <Button disabled={!content || pending || !summary?.dryRun || summary.updated === 0} onClick={() => run(false)}>
          Jetzt importieren
        </Button>
      </div>
      {summary && (
        <Alert variant={summary.errors.length ? "warning" : "success"} title={summary.dryRun ? "Probelauf" : "Import abgeschlossen"}>
          {summary.updated} Fragen werden aktualisiert · {summary.skipped} ohne Änderung · {summary.errors.length} Fehler
          {summary.errors.slice(0, 8).map((e) => (
            <span key={e.row} className="block text-xs">
              Zeile {e.row}: {e.message}
            </span>
          ))}
        </Alert>
      )}
    </div>
  );
}
