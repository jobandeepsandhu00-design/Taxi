"use client";

import { Crown, GraduationCap, Mic, ShieldCheck, Timer } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { CoachAvatar } from "@/components/coach/coach-avatar";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ORAL_PASS_PERCENT } from "@/lib/oral";
import { cn } from "@/lib/utils";
import { ackOralPrivacyAction, setOralSaveAudioAction, startOralSessionAction } from "@/server/actions/oral";

type Recent = { id: string; mode: string; percent: number; date: string };

export function OralStart(props: { enabled: boolean; speech: boolean; unlimited: boolean; remaining: number | null; freeDaily: number; privacyAck: boolean; saveAudio: boolean; questionCount: number; recent: Recent[] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ack, setAck] = useState(props.privacyAck);
  const [noSave, setNoSave] = useState(!props.saveAudio);
  const [timer, setTimer] = useState(false);
  const limitReached = props.remaining !== null && props.remaining <= 0;

  function begin(mode: "ueben" | "pruefung") {
    setError(null);
    start(async () => {
      if (!ack) {
        const r = await ackOralPrivacyAction(!noSave);
        if (!r.ok) return setError(r.error);
        setAck(true);
      }
      const res = await startOralSessionAction({ mode, timer: mode === "pruefung" && timer });
      if (res && !res.ok) setError(res.error);
    });
  }

  function toggleSave(next: boolean) {
    setNoSave(next);
    if (ack) start(async () => void (await setOralSaveAudioAction(!next)));
  }

  if (!props.enabled) {
    return <Alert variant="info">Die mündliche Prüfung ist noch nicht eingerichtet. Schau bald wieder vorbei!</Alert>;
  }

  return (
    <div className="space-y-5">
      {error && <Alert variant="error">{error}</Alert>}
      {!props.speech && <Alert variant="info">Die Spracherkennung ist gerade nicht verfügbar – du kannst deine Antworten tippen.</Alert>}

      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <CoachAvatar mood="happy" size={64} />
          <div className="text-sm">
            <p className="font-semibold text-navy">So funktioniert&apos;s</p>
            <p className="text-muted-foreground">Gelben Knopf antippen, frei sprechen, nochmal antippen. Dialekt und kleine Fehler sind okay – zählen tun die Kernpunkte.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => begin("ueben")} disabled={pending || limitReached} className="group rounded-3xl border border-border bg-card p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60 disabled:hover:translate-y-0" data-testid="oral-start-ueben">
          <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-[#FFC107] text-black">
            <Mic className="size-6" />
          </span>
          <span className="block font-display text-lg font-bold text-navy">Üben</span>
          <span className="block text-sm text-muted-foreground">Feedback nach jeder Frage, Musterantwort und „Nochmal sprechen“.</span>
          <span className="mt-3 block text-xs font-semibold text-muted-foreground">{props.remaining === null ? "Premium · unbegrenzt" : limitReached ? "Heute geschafft – morgen wieder" : `${props.remaining} von ${props.freeDaily} Fragen heute frei`}</span>
        </button>

        <div className={cn("rounded-3xl border border-border bg-card p-5 shadow-sm", !props.unlimited && "opacity-90")}>
          <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-navy text-white">
            <GraduationCap className="size-6" />
          </span>
          <span className="flex items-center gap-2 font-display text-lg font-bold text-navy">
            Prüfungsmodus {!props.unlimited && <Crown className="size-4 text-warning" aria-label="Premium" />}
          </span>
          <span className="block text-sm text-muted-foreground">10 Fragen wie bei der echten Prüfung, Toni liest vor und fragt nach. Bestanden ab {ORAL_PASS_PERCENT} %.</span>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={timer} onChange={(e) => setTimer(e.target.checked)} className="size-4 accent-[var(--primary)]" disabled={!props.unlimited} />
            <Timer className="size-4" /> 60 Sekunden pro Antwort
          </label>
          <Button className="mt-3 w-full" onClick={() => begin("pruefung")} disabled={pending || !props.unlimited} data-testid="oral-start-pruefung">
            {props.unlimited ? "Prüfung starten" : "Nur mit Premium"}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-3 p-5 text-sm">
          <p className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
            <span>Deine Aufnahme wird nur zur Auswertung verwendet und nach 30 Tagen gelöscht.</span>
          </p>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={noSave} onChange={(e) => toggleSave(e.target.checked)} className="size-4 accent-[var(--primary)]" />
            Aufnahmen nicht speichern (nur das Transkript)
          </label>
          {!ack && <p className="text-xs text-muted-foreground">Mit dem Start bestätigst du diesen Hinweis.</p>}
        </CardContent>
      </Card>

      {props.recent.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-navy">Letzte Durchgänge</h2>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {props.recent.map((r) => (
              <li key={r.id}>
                <Link href={`/muendlich/${r.id}`} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-accent/50">
                  <span>
                    {r.mode === "pruefung" ? "Prüfung" : "Üben"} · {new Date(r.date).toLocaleDateString("de-AT")}
                  </span>
                  <span className={cn("font-semibold tabular-nums", r.mode === "pruefung" && (r.percent >= ORAL_PASS_PERCENT ? "text-success" : "text-destructive"))}>{r.percent} %</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="text-center text-xs text-muted-foreground">{props.questionCount} mündliche Fragen · Fragen mit „Ungeprüft“ werden noch fachlich kontrolliert.</p>
    </div>
  );
}
