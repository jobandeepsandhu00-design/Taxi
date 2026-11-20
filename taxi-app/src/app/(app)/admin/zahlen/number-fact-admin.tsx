"use client";

import { Check, Sparkles, Trash2, Undo2 } from "lucide-react";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { fillStatement, formatValue } from "@/lib/number-facts";
import { createNumberFactAction, deleteNumberFactAction, extractNumberFactsAction, setNumberFactVerifiedAction } from "@/server/actions/admin-numbers";
import { useAction } from "../use-action";

type Fact = { id: string; category: string; statement: string; value: string; unit: string; distractors: string[]; legalReference: string | null; verified: boolean; fromAi: boolean };

export function NumberFactAdmin({ facts }: { facts: Fact[] }) {
  const { run, pending, error, message } = useAction();
  const [form, setForm] = useState({ category: "", statement: "", value: "", unit: "", distractors: "", legalReference: "" });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <div className="space-y-6">
      {error && <Alert variant="error">{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}
      <Card>
        <CardHeader>
          <CardTitle>Neuer Fakt</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => createNumberFactAction(form), { onSuccess: () => setForm({ category: "", statement: "", value: "", unit: "", distractors: "", legalReference: "" }) });
            }}
          >
            <div className="sm:col-span-2">
              <Label htmlFor="nf-statement">Aussage mit Platzhalter {"{x}"}</Label>
              <Input id="nf-statement" value={form.statement} onChange={set("statement")} placeholder="Abstand zum Schutzweg beim Halten: {x}" required />
            </div>
            <div>
              <Label htmlFor="nf-category">Kategorie</Label>
              <Input id="nf-category" value={form.category} onChange={set("category")} placeholder="Abstände" required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="nf-value">Wert</Label>
                <Input id="nf-value" value={form.value} onChange={set("value")} placeholder="5" required />
              </div>
              <div>
                <Label htmlFor="nf-unit">Einheit</Label>
                <Input id="nf-unit" value={form.unit} onChange={set("unit")} placeholder="m" />
              </div>
            </div>
            <div>
              <Label htmlFor="nf-distractors">Ablenker (mit ; getrennt)</Label>
              <Input id="nf-distractors" value={form.distractors} onChange={set("distractors")} placeholder="3; 10; 15" required />
            </div>
            <div>
              <Label htmlFor="nf-legal">Rechtsgrundlage (optional)</Label>
              <Input id="nf-legal" value={form.legalReference} onChange={set("legalReference")} placeholder="§ 24 StVO" />
            </div>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button type="submit" disabled={pending}>
                Anlegen
              </Button>
              <Button type="button" variant="outline" disabled={pending} onClick={() => run(() => extractNumberFactsAction())}>
                <Sparkles /> Mit KI aus Fragen extrahieren
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {facts.length} Fakten · {facts.filter((f) => !f.verified).length} ungeprüft
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {facts.map((f) => (
              <li key={f.id} className="flex flex-wrap items-start gap-3 py-3">
                <span className="min-w-0 flex-1 text-sm">
                  <span className="mb-1 flex flex-wrap gap-1.5 text-[11px]">
                    <span className="rounded-full bg-muted px-2 py-0.5 font-bold">{f.category}</span>
                    {f.verified ? <span className="rounded-full bg-success/12 px-2 py-0.5 font-bold text-success">geprüft</span> : <span className="rounded-full bg-warning/12 px-2 py-0.5 font-bold text-warning">ungeprüft</span>}
                    {f.fromAi && <span className="rounded-full bg-secondary px-2 py-0.5 font-bold text-secondary-foreground">KI</span>}
                  </span>
                  <span className="block font-semibold text-navy">{fillStatement(f.statement, formatValue(f.value, f.unit))}</span>
                  <span className="block text-xs text-muted-foreground">
                    Ablenker: {f.distractors.join(" · ")} {f.legalReference ? `· ${f.legalReference}` : ""}
                  </span>
                </span>
                <span className="flex gap-1">
                  <Button size="sm" variant={f.verified ? "outline" : "success"} disabled={pending} onClick={() => run(() => setNumberFactVerifiedAction(f.id, !f.verified))}>
                    {f.verified ? <Undo2 /> : <Check />} {f.verified ? "Zurücknehmen" : "Freigeben"}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={pending} aria-label="Löschen" onClick={() => run(() => deleteNumberFactAction(f.id), { confirm: "Fakt löschen?" })}>
                    <Trash2 />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
