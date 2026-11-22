"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "motion/react";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Globe,
  HelpCircle,
  Lightbulb,
  Loader2,
  RotateCcw,
  Scale,
  Settings2,
  Sparkles,
  Star,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCoach } from "@/components/coach/coach-provider";
import { WhyPanel } from "@/components/coach/why-panel";
import { FocusSheet } from "@/components/focus/focus-parts";
import { getHelperLang } from "@/lib/helper-lang";
import { READ_AFTER_MS, type ReadStatus, type StoryCard } from "@/lib/lernbuch";
import { isRtl, langInfo, type HelperLang } from "@/lib/languages";
import { haptic, spring } from "@/lib/motion";
import { speechSupported, stopSpeaking as stopDeviceSpeech } from "@/lib/speech";
import { audioEngine } from "@/lib/audio/player";
import { useQuestionAudio } from "@/components/audio/use-question-audio";

function stopSpeaking() {
  stopDeviceSpeech();
  audioEngine().stop();
}
import { cn } from "@/lib/utils";
import { saveChapterPositionAction, updateLernbuchSettingsAction } from "@/server/actions/lernbuch";
import { flushQueue, sendMark, waitForMarks } from "./mark-queue";
import { getSimpleAction, getTranslationAction, type SimpleView, type TranslationView } from "@/server/actions/variants";

type Settings = { autoAdvanceSec: number | null; showWrongAnswers: boolean; textSize: "s" | "m" | "l" | "xl"; audioSpeed: number; quizOnlyUnlocked: boolean };
type Chapter = { id: string; slug: string; title: string; order: number; estMinutes: number; checkPassed: boolean };
/** Abschnitt (10 Fragen) eines Kapitels */
export type StorySection = { number: number; total: number; from: number; to: number; offset: number; nextHref: string | null };

const TEXT: Record<Settings["textSize"], { q: string; a: string }> = {
  s: { q: "text-lg", a: "text-sm" },
  m: { q: "text-xl", a: "text-base" },
  l: { q: "text-2xl", a: "text-lg" },
  xl: { q: "text-3xl", a: "text-xl" },
};

/** Link, der vor dem Navigieren auf gespeicherte Markierungen wartet. */
function LeaveLink({ href, className, children, testid, label }: { href: string; className: string; children: React.ReactNode; testid?: string; label?: string }) {
  const router = useRouter();
  return (
    <a
      href={href}
      className={className}
      data-testid={testid}
      aria-label={label}
      onClick={async (e) => {
        e.preventDefault();
        stopSpeaking();
        await waitForMarks();
        router.push(href);
        router.refresh();
      }}
    >
      {children}
    </a>
  );
}

export function StoryPlayer({
  kind,
  chapter,
  cards: initialCards,
  startAt,
  settings: initialSettings,
  exitHref,
  section = null,
}: {
  kind: "chapter" | "repeat";
  chapter: Chapter | null;
  cards: StoryCard[];
  startAt: number;
  settings: Settings;
  exitHref: string;
  section?: StorySection | null;
}) {
  const offset = section?.offset ?? 0;
  const router = useRouter();
  const reduce = useReducedMotion();
  const { enabled: coachEnabled } = useCoach();
  const [cards, setCards] = useState(initialCards);
  // -1 = Intro, cards.length = Zusammenfassung
  const [index, setIndex] = useState(kind === "repeat" ? (initialCards.length ? 0 : initialCards.length) : startAt);
  const [dir, setDir] = useState(1);
  const [settings, setSettings] = useState(initialSettings);
  const [showWrong, setShowWrong] = useState(initialSettings.showWrongAnswers);
  const [speaking, setSpeaking] = useState(false);
  const [sheet, setSheet] = useState<null | "settings" | "translate" | "simple" | "why">(null);
  const [session, setSession] = useState({ verstanden: 0, nochmal: 0 });
  const readTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const card = index >= 0 && index < cards.length ? cards[index] : null;
  const audioFor = useQuestionAudio();
  const cardRef = useRef<string | null>(null);
  cardRef.current = card?.id ?? null;
  const total = cards.length;

  useEffect(() => {
    void flushQueue();
    const on = () => void flushQueue();
    window.addEventListener("online", on);
    return () => window.removeEventListener("online", on);
  }, []);

  const setStatus = useCallback((id: string, status: ReadStatus) => {
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, status: c.status && status === "gelesen" ? c.status : status } : c)));
  }, []);

  const go = useCallback(
    (next: number) => {
      const clamped = Math.max(kind === "chapter" ? -1 : 0, Math.min(total, next));
      if (clamped === index) return;
      haptic();
      stopSpeaking();
      setSpeaking(false);
      setDir(clamped > index ? 1 : -1);
      setIndex(clamped);
      setSheet(null);
    },
    [index, total, kind],
  );

  // Gelesen nach ≥ 3 s sichtbarer Karte; Position speichern
  useEffect(() => {
    if (!card) return;
    if (kind === "chapter" && chapter) {
      const pos = offset + index;
      void saveChapterPositionAction(chapter.id, pos).catch(() => undefined);
    }
    if (card.status) return;
    readTimer.current = setTimeout(() => {
      setStatus(card.id, "gelesen");
      void sendMark(card.id, "gelesen").then(() => {
        if (kind === "chapter" && chapter) void saveChapterPositionAction(chapter.id, offset + index).catch(() => undefined);
      });
    }, READ_AFTER_MS);
    return () => {
      if (readTimer.current) clearTimeout(readTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id]);

  // Automatisch weiter (optional)
  useEffect(() => {
    if (autoTimer.current) clearTimeout(autoTimer.current);
    if (!card || !settings.autoAdvanceSec || sheet || speaking) return;
    autoTimer.current = setTimeout(() => go(index + 1), settings.autoAdvanceSec * 1000);
    return () => {
      if (autoTimer.current) clearTimeout(autoTimer.current);
    };
  }, [card, settings.autoAdvanceSec, sheet, speaking, go, index]);

  // Tastatur
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (sheet) {
        if (e.key === "Escape") setSheet(null);
        return;
      }
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        go(index + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(index - 1);
      } else if (e.key === "Escape") {
        router.push(exitHref);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, sheet, router, exitHref]);

  useEffect(() => () => stopSpeaking(), []);

  const rate = (status: "verstanden" | "nochmal") => {
    if (!card) return;
    if (readTimer.current) clearTimeout(readTimer.current);
    setStatus(card.id, status);
    setSession((s) => ({ ...s, [status]: s[status] + 1 }));
    void sendMark(card.id, status);
    go(index + 1);
  };

  const toggleStar = () => {
    if (!card) return;
    const starred = !card.starred;
    haptic();
    setCards((cs) => cs.map((c) => (c.id === card.id ? { ...c, starred, status: c.status ?? "gelesen" } : c)));
    void sendMark(card.id, starred ? "starred" : "unstarred");
  };

  // Vorlesen: Studio-Audio (Frage → Antwort), sonst Gerätestimme
  const readAloud = async () => {
    if (!card) return;
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    const engine = audioEngine();
    if (!engine.unlocked) void engine.unlock();
    setSpeaking(true);
    const id = card.id;
    const set = await audioFor.get(id);
    const alive = () => cardRef.current === id;
    if (!alive()) return;
    await engine.playOrSpeak(set.question, card.question);
    if (!alive()) return;
    await engine.silence(400);
    if (!alive()) return;
    await engine.playOrSpeak(set.answer, card.answer);
    if (alive()) setSpeaking(false);
  };

  const openHelper = (s: "translate" | "simple" | "why") => {
    if (!card) return;
    if (!card.status) {
      setStatus(card.id, "gelesen");
      void sendMark(card.id, "gelesen");
    }
    setSheet(s);
  };

  const updateSettings = (patch: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...patch }));
    if (patch.showWrongAnswers !== undefined) setShowWrong(patch.showWrongAnswers);
    void updateLernbuchSettingsAction(patch as never).catch(() => undefined);
  };

  // Wischen
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60 || info.velocity.x < -400) go(index + 1);
    else if (info.offset.x > 60 || info.velocity.x > 400) go(index - 1);
  };

  // Tippen links/rechts (nicht auf Knöpfen/Texten mit eigener Funktion)
  const onTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, a, [data-no-tap]")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    if (x < 0.3) go(index - 1);
    else if (x > 0.7) go(index + 1);
  };

  const t = TEXT[settings.textSize];
  const progress = total ? Math.max(0, Math.min(index + 1, total)) / total : 0;
  const readCount = cards.filter((c) => c.status).length;

  return (
    <div className="fixed inset-0 flex flex-col bg-background" style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      {/* Kopf */}
      <header className="flex items-center gap-2 px-3 pt-3 pb-2 sm:px-6">
        <LeaveLink href={exitHref} className="rounded-full p-2 hover:bg-accent" label="Story schließen" testid="story-close">
          <X className="size-5" />
        </LeaveLink>
        <div className="min-w-0 flex-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.max(0, Math.min(index + 1, total))} aria-label="Fortschritt">
            <motion.div className="h-full origin-left rounded-full bg-primary" animate={{ scaleX: progress }} transition={spring} style={{ width: "100%" }} />
          </div>
          <p className="mt-1 truncate text-[11px] font-semibold text-muted-foreground">
            {kind === "repeat" ? "Wiederholung" : chapter?.title} {section && <>· Abschnitt {section.number}</>} {card && <>· Karte {index + 1} von {total}</>}
          </p>
        </div>
        <button type="button" onClick={() => setSheet("settings")} className="rounded-full p-2 hover:bg-accent" aria-label="Einstellungen" data-testid="story-settings">
          <Settings2 className="size-5" />
        </button>
      </header>

      {/* Karte */}
      <div className="relative min-h-0 flex-1 overflow-hidden" onClick={onTap}>
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={index}
            custom={dir}
            className="absolute inset-0 overflow-y-auto px-4 pb-4 sm:px-6"
            initial={reduce ? { opacity: 0 } : { x: dir * 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { x: dir * -80, opacity: 0 }}
            transition={reduce ? { duration: 0.15 } : spring}
            drag={reduce ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.25}
            onDragEnd={onDragEnd}
          >
            <div className="mx-auto max-w-2xl py-2" aria-live="polite">
              {index === -1 && chapter && <IntroCard chapter={chapter} section={section} total={total} read={readCount} onStart={() => go(0)} />}
              {card && (
                <QuestionCard
                  card={card}
                  textClass={t}
                  showWrong={showWrong}
                  onToggleWrong={() => setShowWrong((v) => !v)}
                />
              )}
              {index >= total && (
                <SummaryCard kind={kind} chapter={chapter} section={section} total={total} read={readCount} session={session} cards={cards} exitHref={exitHref} onRestart={() => go(0)} />
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Werkzeuge + Bewertung */}
      {card && (
        <footer className="border-t border-border bg-background/80 px-3 pt-2 pb-3 backdrop-blur sm:px-6">
          <div className="mx-auto max-w-2xl">
            <div className="mb-2 flex items-center justify-between gap-1 overflow-x-auto">
              {speechSupported() && (
                <ToolButton onClick={() => void readAloud()} label={speaking ? "Stopp" : "Vorlesen"} active={speaking} testid="story-speak">
                  {speaking ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                </ToolButton>
              )}
              {coachEnabled && (
                <>
                  <ToolButton onClick={() => openHelper("translate")} label="Übersetzen" testid="story-translate">
                    <Globe className="size-4" />
                  </ToolButton>
                  <ToolButton onClick={() => openHelper("simple")} label="Einfach (B1)" testid="story-simple">
                    <Sparkles className="size-4" />
                  </ToolButton>
                </>
              )}
              <ToolButton onClick={() => openHelper("why")} label="Warum?" testid="story-why">
                <HelpCircle className="size-4" />
              </ToolButton>
              <ToolButton onClick={toggleStar} label={card.starred ? "Gemerkt" : "Merken"} active={card.starred} testid="story-star">
                <Star className={cn("size-4", card.starred && "fill-current")} />
              </ToolButton>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => go(index - 1)} className="rounded-xl p-3 hover:bg-accent" aria-label="Vorherige Karte">
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => rate("nochmal")}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-warning/40 bg-warning/10 font-bold text-warning active:scale-[0.98]"
                data-testid="story-again"
              >
                <RotateCcw className="size-4" /> Nochmal
              </button>
              <button
                type="button"
                onClick={() => rate("verstanden")}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-success font-bold text-white active:scale-[0.98]"
                data-testid="story-understood"
              >
                <Check className="size-4" /> Verstanden
              </button>
              <button type="button" onClick={() => go(index + 1)} className="rounded-xl p-3 hover:bg-accent" aria-label="Nächste Karte" data-testid="story-next">
                <ChevronRight className="size-5" />
              </button>
            </div>
          </div>
        </footer>
      )}

      <FocusSheet open={sheet === "settings"} onClose={() => setSheet(null)} title="Story-Einstellungen" testId="story-settings-sheet">
        <SettingsPanel settings={settings} onChange={updateSettings} />
      </FocusSheet>
      {card && (
        <>
          <FocusSheet open={sheet === "translate"} onClose={() => setSheet(null)} title="Übersetzung">
            <TranslatePanel key={card.id} card={card} />
          </FocusSheet>
          <FocusSheet open={sheet === "simple"} onClose={() => setSheet(null)} title="Einfach erklärt (B1)">
            <SimplePanel key={card.id} card={card} />
          </FocusSheet>
          <FocusSheet open={sheet === "why"} onClose={() => setSheet(null)} title="Warum?">
            {sheet === "why" && <WhyPanel key={card.id} questionId={card.id} selectedOptionIds={[]} isCorrect autoOpen />}
          </FocusSheet>
        </>
      )}
    </div>
  );
}

function ToolButton({ onClick, label, active, children, testid }: { onClick: () => void; label: string; active?: boolean; children: React.ReactNode; testid?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testid}
      aria-pressed={active}
      className={cn("flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-semibold whitespace-nowrap transition", active ? "bg-primary/15 text-primary" : "text-foreground/70 hover:bg-accent")}
    >
      {children}
      {label}
    </button>
  );
}

function IntroCard({ chapter, section, total, read, onStart }: { chapter: Chapter; section: StorySection | null; total: number; read: number; onStart: () => void }) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 text-center" data-testid="story-intro">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <BookOpen className="size-8" />
      </span>
      <p className="text-xs font-bold tracking-wider text-link uppercase">
        Kapitel {chapter.order}
        {section && <> · Abschnitt {section.number} von {section.total}</>}
      </p>
      <h1 className="text-3xl font-extrabold text-navy">{chapter.title}</h1>
      <p className="text-muted-foreground">
        {section ? <>Fragen {section.from}–{section.to} · </> : null}
        {total} Karten · ca. {section ? Math.max(1, Math.round(total * 0.5)) : chapter.estMinutes} Min.{read > 0 && <> · {read} schon gelesen</>}
      </p>
      <ul className="max-w-sm space-y-1 text-left text-sm text-muted-foreground">
        <li>👉 Wischen oder rechts tippen: nächste Karte</li>
        <li>✅ „Verstanden“ oder 🔁 „Nochmal“ – Nochmal-Karten kommen morgen wieder</li>
        <li>🏁 Am Ende: Kapitel-Check mit 5 Fragen</li>
      </ul>
      <button type="button" onClick={onStart} className="mt-2 h-12 rounded-xl bg-primary px-8 font-bold text-primary-foreground" data-testid="story-start">
        Los geht’s
      </button>
    </div>
  );
}

function QuestionCard({ card, textClass, showWrong, onToggleWrong }: { card: StoryCard; textClass: { q: string; a: string }; showWrong: boolean; onToggleWrong: () => void }) {
  return (
    <article className="space-y-4" data-testid="story-card" data-card-id={card.id}>
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        {card.status === "verstanden" && <span className="rounded-full bg-success/15 px-2 py-0.5 text-success">Verstanden</span>}
        {card.status === "nochmal" && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-warning">Nochmal</span>}
        {card.status === "gelesen" && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">Gelesen</span>}
      </div>
      <h2 className={cn("leading-snug font-extrabold text-navy", textClass.q)}>{card.question}</h2>
      <section className="rounded-2xl border border-success/40 bg-success/10 p-4" data-testid="story-answer">
        <p className="mb-1 flex items-center gap-1.5 text-xs font-bold tracking-wide text-success uppercase">
          <Check className="size-3.5" /> Antwort laut Skript
        </p>
        <p className={cn("leading-relaxed whitespace-pre-line", textClass.a)}>{card.answer}</p>
      </section>
      {card.wrong.length > 0 && (
        <div data-no-tap>
          <button type="button" onClick={onToggleWrong} className="flex items-center gap-1.5 text-sm font-semibold text-link" data-testid="story-toggle-wrong">
            {showWrong ? <EyeOff className="size-4" /> : <Eye className="size-4" />} {showWrong ? "Falsche Antworten ausblenden" : "Falsche Antworten zeigen"}
          </button>
          {showWrong && (
            <ul className="mt-2 space-y-2" data-testid="story-wrong">
              {card.wrong.map((w, i) => (
                <li key={i} className="rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm whitespace-pre-line text-foreground/80">
                  <span className="mr-1 font-bold text-destructive">✗</span> {w}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {card.explanation && (
        <section className="rounded-2xl bg-foreground/5 p-4 text-sm">
          <p className="mb-1 font-bold text-navy">Erklärung</p>
          <p className="leading-relaxed whitespace-pre-line">{card.explanation}</p>
        </section>
      )}
      {card.mnemonic && (
        <section className="flex gap-2 rounded-2xl bg-primary/10 p-4 text-sm">
          <Lightbulb className="size-4 shrink-0 text-primary" />
          <p>
            <b>Merkhilfe:</b> {card.mnemonic}
          </p>
        </section>
      )}
      {card.legal && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Scale className="size-3.5" /> {card.legal}
        </p>
      )}
    </article>
  );
}

function SummaryCard({
  kind,
  chapter,
  section,
  total,
  read,
  session,
  cards,
  exitHref,
  onRestart,
}: {
  kind: "chapter" | "repeat";
  chapter: Chapter | null;
  section: StorySection | null;
  total: number;
  read: number;
  session: { verstanden: number; nochmal: number };
  cards: StoryCard[];
  exitHref: string;
  onRestart: () => void;
}) {
  const understood = cards.filter((c) => c.status === "verstanden").length;
  const again = cards.filter((c) => c.status === "nochmal").length;
  const allRead = read >= total;
  if (kind === "repeat" && total === 0) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 text-center" data-testid="story-summary">
        <Trophy className="size-12 text-primary" />
        <h1 className="text-2xl font-extrabold text-navy">Nichts zu wiederholen</h1>
        <p className="text-muted-foreground">Super – alle Karten sind erledigt.</p>
        <Link href={exitHref} className="mt-2 h-12 rounded-xl bg-primary px-8 leading-[3rem] font-bold text-primary-foreground">
          Zum Lernbuch
        </Link>
      </div>
    );
  }
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 text-center" data-testid="story-summary">
      <motion.span initial={{ scale: 0.6, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={spring} className="flex size-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <Trophy className="size-8" />
      </motion.span>
      <h1 className="text-2xl font-extrabold text-navy">{kind === "repeat" ? "Wiederholung geschafft!" : section ? (allRead ? `Abschnitt ${section.number} geschafft!` : `Ende von Abschnitt ${section.number}`) : allRead ? "Kapitel gelesen!" : "Ende des Kapitels"}</h1>
      <div className="grid w-full max-w-sm grid-cols-3 gap-2">
        <SumStat value={`${read}/${total}`} label="gelesen" />
        <SumStat value={String(understood)} label="verstanden" />
        <SumStat value={String(again)} label="nochmal" />
      </div>
      {session.verstanden + session.nochmal > 0 && (
        <p className="text-sm text-muted-foreground">
          In dieser Runde: {session.verstanden} verstanden, {session.nochmal} nochmal.
        </p>
      )}
      <div className="flex w-full max-w-sm flex-col gap-2">
        {section?.nextHref && (
          <LeaveLink href={section.nextHref} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground" testid="summary-next-section">
            Weiter mit Abschnitt {section.number + 1} <ChevronRight className="size-4" />
          </LeaveLink>
        )}
        {kind === "chapter" && chapter && allRead && !chapter.checkPassed && !section?.nextHref && (
          <LeaveLink href={exitHref} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground" testid="summary-check">
            <Trophy className="size-4" /> Weiter zum Kapitel-Check
          </LeaveLink>
        )}
        {kind === "chapter" && !allRead && (
          <p className="text-sm text-warning">Noch {total - read} {total - read === 1 ? "Karte" : "Karten"} {section ? "in diesem Abschnitt " : ""}ungelesen – für den Kapitel-Check musst du alle lesen.</p>
        )}
        <button type="button" onClick={onRestart} className="h-12 rounded-xl border border-border font-bold">
          Nochmal von vorne
        </button>
        <LeaveLink href={exitHref} className="flex h-12 items-center justify-center rounded-xl font-bold text-link">
          {kind === "repeat" ? "Zum Lernbuch" : "Zur Kapitelübersicht"}
        </LeaveLink>
      </div>
    </div>
  );
}

function SumStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="glass rounded-xl p-3">
      <div className="text-lg font-extrabold text-navy">{value}</div>
      <div className="text-[11px] font-semibold text-muted-foreground">{label}</div>
    </div>
  );
}

function SettingsPanel({ settings, onChange }: { settings: Settings; onChange: (p: Partial<Settings>) => void }) {
  const Opt = <T extends string | number | null>({ value, current, label, set }: { value: T; current: T; label: string; set: (v: T) => void }) => (
    <button type="button" onClick={() => set(value)} aria-pressed={value === current} className={cn("rounded-xl px-3 py-2 text-sm font-semibold", value === current ? "bg-primary text-primary-foreground" : "bg-foreground/5")}>
      {label}
    </button>
  );
  return (
    <div className="space-y-5 text-sm">
      <div>
        <p className="mb-2 font-bold text-navy">Automatisch weiter</p>
        <div className="flex flex-wrap gap-2">
          {([null, 8, 12, 20] as const).map((v) => (
            <Opt key={String(v)} value={v as number | null} current={settings.autoAdvanceSec} label={v ? `${v} s` : "Aus"} set={(x) => onChange({ autoAdvanceSec: x })} />
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 font-bold text-navy">Schriftgröße</p>
        <div className="flex flex-wrap gap-2">
          {(["s", "m", "l", "xl"] as const).map((v) => (
            <Opt key={v} value={v as string} current={settings.textSize} label={v.toUpperCase()} set={(x) => onChange({ textSize: x as Settings["textSize"] })} />
          ))}
        </div>
      </div>
      <label className="flex items-center justify-between gap-3">
        <span className="font-bold text-navy">Falsche Antworten immer zeigen</span>
        <input type="checkbox" className="size-5 accent-[var(--primary)]" checked={settings.showWrongAnswers} onChange={(e) => onChange({ showWrongAnswers: e.target.checked })} />
      </label>
      <label className="flex items-center justify-between gap-3">
        <span>
          <span className="block font-bold text-navy">Quiz nur aus freigeschalteten Kapiteln</span>
          <span className="block text-xs text-muted-foreground">Ab dem ersten bestandenen Kapitel-Check</span>
        </span>
        <input type="checkbox" className="size-5 accent-[var(--primary)]" checked={settings.quizOnlyUnlocked} onChange={(e) => onChange({ quizOnlyUnlocked: e.target.checked })} />
      </label>
    </div>
  );
}

function TranslatePanel({ card }: { card: StoryCard }) {
  const [lang, setLang] = useState<HelperLang | null>(null);
  const [data, setData] = useState<TranslationView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const l = getHelperLang() ?? "en";
    setLang(l);
    setLoading(true);
    getTranslationAction(card.id, l)
      .then((r) => (r.ok ? setData(r.data) : setError(r.error)))
      .catch(() => setError("Übersetzung nicht verfügbar."))
      .finally(() => setLoading(false));
  }, [card.id]);
  const correct = useMemo(() => data?.options.filter((o) => card.answerLabels.includes(o.label)) ?? [], [data, card.answerLabels]);
  if (loading) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Wird übersetzt …</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data || !lang) return null;
  return (
    <div dir={isRtl(lang) ? "rtl" : "ltr"} className="space-y-3 text-sm" data-testid="story-translation">
      <p className="text-xs font-semibold text-muted-foreground">{langInfo(lang)?.name}{!data.verified && " · KI-Übersetzung, ungeprüft"}</p>
      <p className="text-base font-bold">{data.question}</p>
      {correct.map((o) => (
        <p key={o.label} className="rounded-xl bg-success/10 p-3 whitespace-pre-line">✓ {o.text}</p>
      ))}
      {data.explanation && <p className="whitespace-pre-line text-muted-foreground">{data.explanation}</p>}
    </div>
  );
}

function SimplePanel({ card }: { card: StoryCard }) {
  const [data, setData] = useState<SimpleView | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    getSimpleAction(card.id)
      .then((r) => (r.ok ? setData(r.data) : setError(r.error)))
      .catch(() => setError("Nicht verfügbar."));
  }, [card.id]);
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!data) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Wird vereinfacht …</p>;
  const correct = data.options.filter((o) => card.answerLabels.includes(o.label));
  return (
    <div className="space-y-3 text-sm" data-testid="story-simple-content">
      {!data.verified && <p className="text-xs text-muted-foreground">KI-Vereinfachung, ungeprüft – im Zweifel gilt das Skript.</p>}
      <p className="text-base font-bold">{data.text}</p>
      {correct.map((o) => (
        <p key={o.id} className="rounded-xl bg-success/10 p-3 whitespace-pre-line">✓ {o.text}</p>
      ))}
      {data.glossary.length > 0 && (
        <dl className="space-y-1.5">
          {data.glossary.map((g) => (
            <div key={g.term}>
              <dt className="font-bold">{g.term}</dt>
              <dd className="text-muted-foreground">{g.definition}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
