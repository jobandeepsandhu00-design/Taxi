"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import type { AppSettings } from "@/lib/settings";
import { saveSettingsAction } from "@/server/actions/admin";
import { useAction } from "../use-action";

export function SettingsForm({ initial }: { initial: AppSettings }) {
  const [s, setS] = useState(initial);
  const { run, pending, error, message, fieldErrors } = useAction();
  return (
    <Card className="space-y-5 p-5">
      {error && <Alert variant="error">{error}</Alert>}
      {message && !error && <Alert variant="success">{message}</Alert>}
      <div className="space-y-1.5">
        <Label htmlFor="threshold">Fehlertraining: richtige Antworten in Folge bis zur Entfernung</Label>
        <Input id="threshold" type="number" min={1} max={10} value={s.mistakeRemovalThreshold} onChange={(e) => setS({ ...s, mistakeRemovalThreshold: Number(e.target.value) })} />
        <FieldError messages={fieldErrors.mistakeRemovalThreshold} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="quizSize">Standardanzahl Fragen im Übungsquiz</Label>
        <Input id="quizSize" type="number" min={1} max={200} value={s.defaultQuizSize} onChange={(e) => setS({ ...s, defaultQuizSize: Number(e.target.value) })} />
        <FieldError messages={fieldErrors.defaultQuizSize} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="disclaimer">Rechtlicher Hinweis (wird in der Fußzeile angezeigt)</Label>
        <Textarea id="disclaimer" rows={4} value={s.disclaimer} onChange={(e) => setS({ ...s, disclaimer: e.target.value })} />
        <FieldError messages={fieldErrors.disclaimer} />
      </div>
      <Button disabled={pending} onClick={() => run(() => saveSettingsAction(s))}>Einstellungen speichern</Button>
    </Card>
  );
}
