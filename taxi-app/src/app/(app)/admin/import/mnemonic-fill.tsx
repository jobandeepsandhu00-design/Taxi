"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/input";
import { fillMissingMnemonicsAction } from "@/server/actions/admin-lernbuch";

/** Lernbuch: fehlende Merkhilfen pro Kapitel mit KI ergänzen. */
export function MnemonicFill({ categories }: { categories: { id: string; name: string; missing: number }[] }) {
  const [id, setId] = useState(categories.find((c) => c.missing > 0)?.id ?? categories[0]?.id ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="size-5 text-link" /> Lernbuch: Fehlendes ergänzen</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">Erstellt kurze Merkhilfen für Fragen ohne Merkhilfe (15 pro Durchlauf). Grundlage ist nur die Skript-Antwort – bitte stichprobenartig prüfen.</p>
        <div className="space-y-1.5">
          <Label htmlFor="mn-cat">Kapitel</Label>
          <Select id="mn-cat" value={id} onChange={(e) => setId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.missing} ohne Merkhilfe)</option>
            ))}
          </Select>
        </div>
        <Button
          disabled={!id || pending}
          onClick={() =>
            start(async () => {
              const r = await fillMissingMnemonicsAction(id);
              setMsg(r.ok ? `${r.data.filled} Merkhilfen ergänzt · noch ${r.data.remaining} offen` : r.error);
            })
          }
        >
          {pending ? <Loader2 className="animate-spin" /> : <Sparkles />} Merkhilfen ergänzen
        </Button>
        {msg && <p className="text-sm font-semibold text-navy" role="status">{msg}</p>}
      </CardContent>
    </Card>
  );
}
