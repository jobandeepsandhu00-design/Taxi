"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, CheckCircle2, Loader2, Mic, Pause, Play, RefreshCw, Search, Shuffle, Square, Upload, Volume2, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  cancelAudioJobsAction,
  deleteLexiconAction,
  estimateAudioAction,
  getAudioStatusAction,
  kickAudioWorkerAction,
  previewSpokenAction,
  questionAudioAction,
  randomSampleAction,
  regenerateQuestionAudioAction,
  retryFailedAudioAction,
  saveAudioConfigAction,
  saveLexiconAction,
  searchAudioQuestionsAction,
  startAudioJobAction,
  uploadAudioOverrideAction,
  type AudioFile,
  type AudioJobOptions,
  type AudioStatus,
} from "@/server/actions/admin-audio";

type Lex = { term: string; spoken: string; notes: string | null };
type Estimate = Awaited<ReturnType<typeof estimateAudioAction>>;

const KIND_LABEL: Record<string, string> = { question: "Frage", answer: "Antwort", options: "Antwortmöglichkeiten A–D", explanation: "Erklärung" };
const fmtDuration = (ms: number) => {
  const m = Math.round(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
};

export function AudioStudio({ initial, lexicon: initialLex }: { initial: AudioStatus; lexicon: Lex[] }) {
  const [status, setStatus] = useState(initial);
  const [lex, setLex] = useState(initialLex);
  const [lexDraft, setLexDraft] = useState<{ term: string; spoken: string; notes: string } | null>(null);
  const running = status.jobs.some((j) => j.status === "running") || status.totals.pending > 0;

  const refresh = useCallback(async () => setStatus(await getAudioStatusAction()), []);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => void refresh(), 2000);
    // Falls der Worker stehen geblieben ist: alle 30 s erneut anstoßen
    const kick = window.setInterval(() => void kickAudioWorkerAction(), 30000);
    return () => {
      window.clearInterval(id);
      window.clearInterval(kick);
    };
  }, [running, refresh]);

  return (
    <div className="space-y-6">
      <SetupCard status={status} />
      <Totals status={status} />
      <JobCard status={status} onChange={refresh} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="min-w-0 space-y-6 xl:col-span-2">
          <Coverage status={status} onChange={refresh} />
          {status.failedItems.length > 0 && <FailedList status={status} onChange={refresh} />}
        </div>
        <div className="min-w-0 space-y-6">
          <Preview onWrongTerm={(t) => setLexDraft({ term: t, spoken: "", notes: "" })} />
          <Sample />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <LexiconCard lex={lex} setLex={setLex} draft={lexDraft} setDraft={setLexDraft} />
        <ConfigCard status={status} onChange={refresh} />
      </div>
    </div>
  );
}

function SetupCard({ status }: { status: AudioStatus }) {
  const p = status.provider;
  if (p.ready && p.storage) return null;
  return (
    <Alert variant="warning" title="Einrichtung nötig, bevor Audios erzeugt werden können">
      <ul className="mt-1 space-y-1 text-sm">
        <li className="flex items-center gap-2">
          {p.ready ? <CheckCircle2 className="size-4 text-success" /> : <XCircle className="size-4 text-destructive" />} {p.label}: {p.ready ? "eingerichtet" : "Schlüssel fehlt (Vercel: AZURE_SPEECH_KEY + AZURE_SPEECH_REGION, oder TTS_PROVIDER=google/elevenlabs mit deren Schlüssel)"}
        </li>
        <li className="flex items-center gap-2">
          {p.storage ? <CheckCircle2 className="size-4 text-success" /> : <XCircle className="size-4 text-destructive" />} Speicher: {p.storage === "supabase" ? "Supabase Storage" : p.storage === "local" ? "lokal (Entwicklung)" : "SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY fehlen"}
        </li>
      </ul>
      <p className="mt-2 text-xs">Bis dahin liest die App mit der Gerätestimme vor (Hinweis „Ersatzstimme“).</p>
    </Alert>
  );
}

function Totals({ status }: { status: AudioStatus }) {
  const t = status.totals;
  const items = [
    { label: "Fragen", value: t.questions },
    { label: "Vertont (Frage + Antwort)", value: t.covered, tone: "text-success" },
    { label: "Fehlend", value: t.missing, tone: t.missing ? "text-warning" : "text-success" },
    { label: "Fehlgeschlagen", value: t.failed, tone: t.failed ? "text-destructive" : undefined },
    { label: "Gesamtdauer", value: fmtDuration(t.durationMs) },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5" data-testid="audio-totals">
      {items.map((i) => (
        <Card key={i.label} className="p-4">
          <p className={cn("text-2xl font-extrabold text-navy", i.tone)}>{i.value}</p>
          <p className="text-xs text-muted-foreground">{i.label}</p>
        </Card>
      ))}
    </div>
  );
}

function JobCard({ status, onChange }: { status: AudioStatus; onChange: () => void }) {
  const [dialog, setDialog] = useState<AudioJobOptions | null>(null);
  const job = status.jobs.find((j) => j.status === "running") ?? null;
  const last = status.jobs[0];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="size-5 text-link" /> Vertonen
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setDialog({ scope: "all", voiceMode: "default", kinds: ["question", "answer"], force: true })} data-testid="audio-all">
            Alle Fragen vertonen
          </Button>
          <Button variant="outline" onClick={() => setDialog({ scope: "missing", voiceMode: "default", kinds: ["question", "answer"], force: false })} data-testid="audio-missing">
            Nur fehlende vertonen
          </Button>
        </div>
        {job ? (
          <div className="rounded-xl bg-foreground/5 p-4" data-testid="audio-job">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-semibold text-navy">
                <Loader2 className="size-4 animate-spin" /> Läuft{job.currentLabel ? ` · ${job.currentLabel}` : ""}
              </span>
              <span className="font-bold">
                {job.done + job.failed}/{job.total}
                {job.failed ? <span className="text-destructive"> · {job.failed} Fehler</span> : null}
              </span>
            </div>
            <Progress value={job.total ? ((job.done + job.failed) / job.total) * 100 : 0} />
            <Button size="sm" variant="ghost" className="mt-2" onClick={async () => (await cancelAudioJobsAction(), onChange())}>
              <Square /> Abbrechen
            </Button>
          </div>
        ) : last ? (
          <p className="text-sm text-muted-foreground" data-testid="audio-last-job">
            Letzter Auftrag: {last.status === "done" ? "abgeschlossen" : last.status === "failed" ? "mit Fehlern beendet" : last.status} · {last.done}/{last.total} erzeugt
            {last.failed ? ` · ${last.failed} Fehler` : ""}
          </p>
        ) : null}
      </CardContent>
      <EstimateDialog opts={dialog} onClose={() => setDialog(null)} onStarted={onChange} />
    </Card>
  );
}

function EstimateDialog({ opts, onClose, onStarted }: { opts: AudioJobOptions | null; onClose: () => void; onStarted: () => void }) {
  const [o, setO] = useState<AudioJobOptions | null>(opts);
  const [est, setEst] = useState<Estimate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => {
    setO(opts);
    setError(null);
  }, [opts]);
  useEffect(() => {
    if (!o) return;
    setEst(null);
    void estimateAudioAction(o).then(setEst);
  }, [o]);
  if (!o) return null;
  const toggleKind = (k: AudioJobOptions["kinds"][number]) => setO({ ...o, kinds: o.kinds.includes(k) ? o.kinds.filter((x) => x !== k) : [...o.kinds, k] });
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Vertonen bestätigen">
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={spring} className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-border bg-card-solid p-5 shadow-2xl sm:rounded-3xl">
        <h2 className="text-lg font-extrabold text-navy">{o.scope === "missing" ? "Nur fehlende vertonen" : o.scope === "all" ? "Alle Fragen vertonen" : "Neu generieren"}</h2>
        <div className="mt-3 space-y-3 text-sm">
          <div>
            <p className="mb-1 font-semibold">Stimmen</p>
            <div className="flex gap-2">
              {(["default", "both"] as const).map((v) => (
                <button key={v} type="button" onClick={() => setO({ ...o, voiceMode: v })} className={cn("rounded-xl px-3 py-2 font-semibold", o.voiceMode === v ? "bg-primary text-primary-foreground" : "bg-foreground/5")}>
                  {v === "default" ? "Nur Standardstimme" : "Beide Stimmen"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 font-semibold">Inhalte</p>
            <div className="grid grid-cols-2 gap-2">
              {(["question", "answer", "options", "explanation"] as const).map((k) => (
                <label key={k} className="flex items-center gap-2">
                  <input type="checkbox" checked={o.kinds.includes(k)} onChange={() => toggleKind(k)} className="size-4" /> {KIND_LABEL[k]}
                </label>
              ))}
            </div>
          </div>
          {o.scope !== "missing" && (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={o.force} onChange={(e) => setO({ ...o, force: e.target.checked })} className="size-4" /> Auch bereits vertonte neu erzeugen
            </label>
          )}
          <div className="rounded-xl bg-foreground/5 p-3" data-testid="audio-estimate">
            {est ? (
              <ul className="space-y-0.5">
                <li>
                  <b>{est.files}</b> Dateien aus {est.questions} Fragen
                </li>
                <li>{est.characters.toLocaleString("de-AT")} Zeichen</li>
                <li>
                  ca. {est.costEur.toLocaleString("de-AT", { style: "currency", currency: "EUR" })} ({est.provider})
                </li>
                <li>ca. {est.minutes} Minuten</li>
                {!est.providerReady && <li className="text-destructive">Anbieter nicht eingerichtet – Start nicht möglich.</li>}
                {!est.storage && <li className="text-destructive">Speicher nicht eingerichtet.</li>}
              </ul>
            ) : (
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Schätze …
              </span>
            )}
          </div>
          {error && <p className="text-destructive">{error}</p>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            disabled={pending || !est || est.files === 0 || o.kinds.length === 0}
            data-testid="audio-confirm"
            onClick={() =>
              start(async () => {
                const r = await startAudioJobAction(o);
                if (!r.ok) return setError(r.error);
                onClose();
                onStarted();
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />} {est?.files ?? 0} Dateien erzeugen
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function Coverage({ status, onChange }: { status: AudioStatus; onChange: () => void }) {
  const [dialog, setDialog] = useState<AudioJobOptions | null>(null);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Abdeckung nach Thema und Kapitel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5" data-testid="audio-coverage">
        {status.topics.map((t) => (
          <div key={t.id}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="font-bold text-navy">{t.title}</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold">
                  {t.covered}/{t.total} {t.covered === t.total ? "✅" : ""}
                </span>
                <button type="button" className="text-link underline-offset-2 hover:underline" onClick={() => setDialog({ scope: "topic", scopeId: t.id, voiceMode: "default", kinds: ["question", "answer"], force: true })}>
                  Neu generieren
                </button>
              </div>
            </div>
            <ul className="space-y-2 border-l-2 border-border pl-3">
              {status.chapters
                .filter((c) => c.topicId === t.id)
                .map((c) => (
                  <li key={c.id} className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate">{c.name}</span>
                      <span className="flex shrink-0 items-center gap-2 text-xs">
                        <span className={cn("font-bold", c.covered === c.total ? "text-success" : "text-muted-foreground")}>
                          {c.covered}/{c.total} {c.covered === c.total ? "✅" : ""}
                        </span>
                        {c.failed > 0 && <span className="text-destructive">{c.failed} ⚠</span>}
                        <button type="button" aria-label={`${c.name} neu generieren`} className="text-link" onClick={() => setDialog({ scope: "chapter", scopeId: c.id, voiceMode: "default", kinds: ["question", "answer"], force: true })}>
                          <RefreshCw className="size-3.5" />
                        </button>
                      </span>
                    </div>
                    <Progress value={c.total ? (c.covered / c.total) * 100 : 0} className="mt-1 h-1.5" barClassName={c.covered === c.total ? "bg-success" : undefined} />
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </CardContent>
      <EstimateDialog opts={dialog} onClose={() => setDialog(null)} onStarted={onChange} />
    </Card>
  );
}

function FailedList({ status, onChange }: { status: AudioStatus; onChange: () => void }) {
  const [pending, start] = useTransition();
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-5 text-destructive" /> Fehlgeschlagen
        </CardTitle>
        <Button size="sm" disabled={pending} onClick={() => start(async () => (await retryFailedAudioAction(), onChange()))}>
          <RefreshCw /> Erneut versuchen
        </Button>
      </CardHeader>
      <CardContent>
        <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
          {status.failedItems.map((f) => (
            <li key={f.id} className="rounded-xl bg-destructive/5 p-2">
              <p className="font-semibold">{f.text}</p>
              <p className="text-xs text-muted-foreground">
                {KIND_LABEL[f.kind]} · {f.voiceId} · {f.error}
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/** Kleiner Player: eine Datei abspielen / stoppen */
function PlayButton({ url, label }: { url: string | null; label: string }) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  if (!url) return <span className="text-xs text-muted-foreground">–</span>;
  return (
    <button
      type="button"
      aria-label={playing ? `${label} stoppen` : `${label} abspielen`}
      className="inline-flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
      onClick={() => {
        if (playing) {
          ref.current?.pause();
          setPlaying(false);
          return;
        }
        ref.current?.pause();
        ref.current = new Audio(url);
        ref.current.onended = () => setPlaying(false);
        void ref.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      }}
    >
      {playing ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
    </button>
  );
}

function Preview({ onWrongTerm }: { onWrongTerm: (term: string) => void }) {
  const [term, setTerm] = useState("");
  const [hits, setHits] = useState<{ id: string; text: string; category: { name: string } }[]>([]);
  const [sel, setSel] = useState<{ question: { id: string; text: string } | null; files: AudioFile[] } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [wrong, setWrong] = useState("");
  const [pending, start] = useTransition();
  const load = (id: string) => start(async () => setSel(await questionAudioAction(id)));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="size-5 text-link" /> Vorschau
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => setHits(await searchAudioQuestionsAction(term)));
          }}
        >
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Frage suchen (Text oder ID)" aria-label="Frage suchen" />
          <Button type="submit" size="icon" aria-label="Suchen">
            <Search />
          </Button>
        </form>
        {hits.length > 0 && !sel && (
          <ul className="max-h-48 space-y-1 overflow-y-auto">
            {hits.map((h) => (
              <li key={h.id}>
                <button type="button" className="w-full rounded-lg p-2 text-left hover:bg-accent" onClick={() => load(h.id)}>
                  <span className="block font-semibold">{h.text}</span>
                  <span className="text-xs text-muted-foreground">{h.category.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {sel?.question && (
          <div className="space-y-2">
            <p className="font-semibold">{sel.question.text}</p>
            {sel.files.length === 0 && <p className="text-muted-foreground">Noch keine Audios.</p>}
            <ul className="space-y-1">
              {sel.files.map((f) => (
                <li key={f.id} className="flex items-center gap-2">
                  <PlayButton url={f.url} label={KIND_LABEL[f.kind]} />
                  <span className="flex-1">
                    {KIND_LABEL[f.kind]} · <span className="text-xs text-muted-foreground">{f.voiceId}</span>
                    {f.source === "upload" && <span className="ml-1 rounded bg-primary/15 px-1 text-[10px] font-bold">Aufnahme</span>}
                  </span>
                  <span className="text-xs text-muted-foreground">{f.status === "done" ? `${(f.durationMs / 1000).toFixed(1)} s` : f.status}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={pending} onClick={() => start(async () => {
                const r = await regenerateQuestionAudioAction(sel.question!.id);
                setMsg(r.ok ? `${r.data.total} Dateien werden neu erzeugt.` : r.error);
              })}>
                <RefreshCw /> Neu generieren
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSel(null)}>
                Andere Frage
              </Button>
            </div>
            <div className="flex gap-2">
              <Input value={wrong} onChange={(e) => setWrong(e.target.value)} placeholder="Welches Wort klingt falsch?" aria-label="Problematisches Wort" />
              <Button size="sm" variant="outline" disabled={!wrong.trim()} onClick={() => onWrongTerm(wrong.trim())}>
                Klingt falsch
              </Button>
            </div>
            <form
              className="space-y-2 rounded-xl bg-foreground/5 p-3"
              action={(fd) =>
                start(async () => {
                  fd.set("questionId", sel.question!.id);
                  const r = await uploadAudioOverrideAction(fd);
                  setMsg(r.ok ? (r.message ?? "Gespeichert") : r.error);
                  if (r.ok) setSel(await questionAudioAction(sel.question!.id));
                })
              }
            >
              <p className="flex items-center gap-1 font-semibold">
                <Upload className="size-4" /> Eigene Aufnahme (MP3)
              </p>
              <Select name="kind" defaultValue="question" aria-label="Art">
                {Object.entries(KIND_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
              <input type="file" name="file" accept="audio/mpeg,.mp3" className="block w-full text-xs" />
              <Button size="sm" type="submit" disabled={pending}>
                Hochladen
              </Button>
            </form>
          </div>
        )}
        {msg && <p className="text-sm font-semibold text-navy">{msg}</p>}
      </CardContent>
    </Card>
  );
}

function Sample() {
  const [files, setFiles] = useState<AudioFile[] | null>(null);
  const [pending, start] = useTransition();
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Zufällige Stichprobe</CardTitle>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => start(async () => setFiles(await randomSampleAction()))} data-testid="audio-sample">
          <Shuffle /> 10 Dateien
        </Button>
      </CardHeader>
      <CardContent>
        {files && files.length === 0 && <p className="text-sm text-muted-foreground">Noch keine fertigen Audios.</p>}
        <ul className="space-y-2 text-sm">
          {files?.map((f) => (
            <li key={f.id} className="flex items-center gap-2">
              <PlayButton url={f.url} label={KIND_LABEL[f.kind]} />
              <span className="min-w-0 flex-1 truncate">
                <span className="text-xs font-bold text-link">{KIND_LABEL[f.kind]}</span> {f.text}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function LexiconCard({ lex, setLex, draft, setDraft }: { lex: Lex[]; setLex: (l: Lex[]) => void; draft: { term: string; spoken: string; notes: string } | null; setDraft: (d: { term: string; spoken: string; notes: string } | null) => void }) {
  const [filter, setFilter] = useState("");
  const [test, setTest] = useState("§ 24 Abs. 1 StVO: 5 m vor dem Schutzweg, 50 km/h, 0,5 ‰");
  const [spoken, setSpoken] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const d = draft ?? { term: "", spoken: "", notes: "" };
  const shown = lex.filter((l) => !filter || l.term.toLowerCase().includes(filter.toLowerCase()) || l.spoken.toLowerCase().includes(filter.toLowerCase()));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Aussprache-Wörterbuch</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <AnimatePresence>
          <motion.form
            className="grid gap-2 rounded-xl bg-foreground/5 p-3 sm:grid-cols-[1fr_1fr_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              if (!d.term.trim() || !d.spoken.trim()) return;
              start(async () => {
                await saveLexiconAction({ term: d.term, spoken: d.spoken, notes: d.notes || undefined });
                setLex([...lex.filter((l) => l.term !== d.term.trim()), { term: d.term.trim(), spoken: d.spoken.trim(), notes: d.notes || null }].sort((a, b) => a.term.localeCompare(b.term)));
                setDraft(null);
              });
            }}
          >
            <div>
              <Label htmlFor="lx-term">Begriff</Label>
              <Input id="lx-term" value={d.term} onChange={(e) => setDraft({ ...d, term: e.target.value })} placeholder="z. B. Praterstern" />
            </div>
            <div>
              <Label htmlFor="lx-spoken">Gesprochen als</Label>
              <Input id="lx-spoken" value={d.spoken} onChange={(e) => setDraft({ ...d, spoken: e.target.value })} placeholder="z. B. Prater-stern" />
            </div>
            <Button type="submit" className="self-end" disabled={pending}>
              Speichern
            </Button>
          </motion.form>
        </AnimatePresence>
        <p className="text-xs text-muted-foreground">Nach Änderungen „Nur fehlende vertonen“ starten – betroffene Fragen werden neu erzeugt.</p>
        <div className="flex gap-2">
          <Input value={test} onChange={(e) => setTest(e.target.value)} aria-label="Testtext" />
          <Button size="sm" variant="outline" onClick={() => start(async () => setSpoken(await previewSpokenAction(test)))}>
            So klingt’s
          </Button>
        </div>
        {spoken && <p className="rounded-xl bg-primary/10 p-2 text-xs" data-testid="lexicon-preview">{spoken}</p>}
        <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtern …" aria-label="Wörterbuch filtern" />
        <ul className="max-h-64 divide-y overflow-y-auto">
          {shown.map((l) => (
            <li key={l.term} className="flex items-center gap-2 py-1.5">
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setDraft({ term: l.term, spoken: l.spoken, notes: l.notes ?? "" })}>
                <b>{l.term}</b> → {l.spoken}
              </button>
              <button type="button" className="text-xs text-destructive" onClick={() => start(async () => (await deleteLexiconAction(l.term), setLex(lex.filter((x) => x.term !== l.term))))}>
                Löschen
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function ConfigCard({ status, onChange }: { status: AudioStatus; onChange: () => void }) {
  const p = status.provider;
  const [f, setF] = useState({ voiceFemale: p.voices.female, voiceMale: p.voices.male, defaultVoice: p.defaultVoice as "female" | "male", pricePerMillion: p.pricePerMillion });
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Stimmen & Kosten</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-xs text-muted-foreground">Anbieter: {p.label} (Umgebungsvariable TTS_PROVIDER). Schlüssel nur in Vercel – nie im Browser.</p>
        <div>
          <Label htmlFor="vf">Stimme weiblich</Label>
          <Input id="vf" value={f.voiceFemale} onChange={(e) => setF({ ...f, voiceFemale: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="vm">Stimme männlich</Label>
          <Input id="vm" value={f.voiceMale} onChange={(e) => setF({ ...f, voiceMale: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="vd">Standardstimme</Label>
            <Select id="vd" value={f.defaultVoice} onChange={(e) => setF({ ...f, defaultVoice: e.target.value as "female" | "male" })}>
              <option value="female">weiblich</option>
              <option value="male">männlich</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="pp">€ pro 1 Mio. Zeichen</Label>
            <Input id="pp" type="number" step="0.5" min="0" value={f.pricePerMillion} onChange={(e) => setF({ ...f, pricePerMillion: Number(e.target.value) })} />
          </div>
        </div>
        <Button disabled={pending} onClick={() => start(async () => { const r = await saveAudioConfigAction(f); setMsg(r.ok ? "Gespeichert" : r.error); onChange(); })}>
          Speichern
        </Button>
        {msg && <p className="text-xs font-semibold text-success">{msg}</p>}
      </CardContent>
    </Card>
  );
}
