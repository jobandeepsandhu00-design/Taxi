"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, BookOpenCheck, Mic, Send, ThumbsDown, ThumbsUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CoachAvatar, type CoachMood } from "@/components/coach/coach-avatar";
import { readCoachStream } from "@/components/coach/stream";
import { Button } from "@/components/ui/button";
import { haptic, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { rateCoachMessageAction } from "@/server/actions/coach";

export interface ChatItem {
  id: string;
  role: "user" | "assistant";
  text: string;
  citations: { id: string; text: string; category: string }[];
  feedback: 1 | -1 | null;
  streaming?: boolean;
  error?: boolean;
}

const CHIPS = ["Was soll ich heute lernen?", "Erklär mir Vorrangregeln", "Wie stehe ich?", "Prüfe mich mündlich"];

function Feedback({ item }: { item: ChatItem }) {
  const [value, setValue] = useState<1 | -1 | null>(item.feedback);
  if (!item.id || item.id.startsWith("tmp")) return null;
  const rate = (v: 1 | -1) => {
    const next = value === v ? null : v;
    setValue(next);
    haptic();
    void rateCoachMessageAction(item.id, next ?? 0);
  };
  return (
    <div className="mt-1 flex gap-1">
      {([1, -1] as const).map((v) => (
        <motion.button
          key={v}
          type="button"
          whileTap={{ scale: 0.8 }}
          onClick={() => rate(v)}
          aria-pressed={value === v}
          aria-label={v === 1 ? "Hilfreiche Antwort" : "Nicht hilfreiche Antwort"}
          className={cn("rounded-lg p-1.5 transition-colors", value === v ? (v === 1 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive") : "text-muted-foreground hover:text-foreground")}
        >
          {v === 1 ? <ThumbsUp className="size-3.5" /> : <ThumbsDown className="size-3.5" />}
        </motion.button>
      ))}
    </div>
  );
}

export function CoachChat({ enabled, initial, remaining: initialRemaining, limit, name, mood: baseMood }: { enabled: boolean; initial: ChatItem[]; remaining: number | null; limit: number; name: string; mood: CoachMood }) {
  const [items, setItems] = useState<ChatItem[]>(initial);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(initialRemaining);
  const [mood, setMood] = useState<CoachMood>(baseMood);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    if (message === "Prüfe mich mündlich") {
      window.location.assign("/coach/muendlich");
      return;
    }
    haptic();
    setInput("");
    setBusy(true);
    setMood("thinking");
    const tmpId = `tmp-${Date.now()}`;
    setItems((prev) => [...prev, { id: `${tmpId}-u`, role: "user", text: message, citations: [], feedback: null }, { id: tmpId, role: "assistant", text: "", citations: [], feedback: null, streaming: true }]);
    const patch = (fn: (it: ChatItem) => ChatItem) => setItems((prev) => prev.map((it) => (it.id === tmpId ? fn(it) : it)));
    let finalId: string | undefined;
    await readCoachStream("/api/coach/chat", { message }, (e) => {
      if (e.type === "meta") {
        if (e.remaining !== undefined) setRemaining(e.remaining);
        if (e.citations) patch((it) => ({ ...it, citations: e.citations ?? [] }));
      } else if (e.type === "delta") {
        setMood("idle");
        patch((it) => ({ ...it, text: it.text + e.text }));
      } else if (e.type === "error") {
        patch((it) => ({ ...it, text: it.text || e.message, error: true }));
        setMood("sad");
      } else if (e.type === "done") finalId = e.messageId;
    }).catch(() => patch((it) => ({ ...it, text: "Der Coach ist gerade nicht erreichbar.", error: true })));
    setItems((prev) => prev.map((it) => (it.id === tmpId ? { ...it, streaming: false, id: finalId ?? it.id } : it)));
    setMood((m) => (m === "sad" ? "sad" : "happy"));
    window.setTimeout(() => setMood(baseMood), 2500);
    setBusy(false);
  }

  if (!enabled) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-10 text-center">
        <div className="flex justify-center">
          <CoachAvatar mood="sad" size={96} />
        </div>
        <h1 className="text-2xl font-bold text-navy">Dein Taxi-Coach</h1>
        <p className="text-muted-foreground">Der KI-Coach ist noch nicht eingerichtet. Sobald der Betreiber den API-Schlüssel hinterlegt, kann es losgehen.</p>
        <Button asChild variant="outline">
          <Link href="/coach/bericht">Zum Wochenbericht</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <div className="glass mb-4 flex items-center gap-3 rounded-2xl p-3">
        <CoachAvatar mood={mood} size={52} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-lg font-bold text-navy">Dein Taxi-Coach</h1>
          <p className="text-xs text-muted-foreground">{remaining === null ? "Premium · unbegrenzt" : `${remaining} von ${limit} Nachrichten heute übrig`}</p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/coach/muendlich">
            <Mic /> Mündlich
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
          <Link href="/coach/bericht">
            <BookOpenCheck /> Wochenbericht
          </Link>
        </Button>
      </div>

      <div className="min-h-[40vh] space-y-4 pb-40" aria-live="polite">
        {items.length === 0 && (
          <motion.div className="glass rounded-2xl p-5 text-center" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <p className="font-bold text-navy">Servus {name}! 👋</p>
            <p className="mt-1 text-sm text-muted-foreground">Ich kenne deinen Lernstand und helfe dir, gezielt für die Taxi-Prüfung zu lernen. Frag mich etwas oder tippe auf einen Vorschlag.</p>
          </motion.div>
        )}
        <AnimatePresence initial={false}>
          {items.map((it) => (
            <motion.div key={it.id} layout initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={spring} className={cn("flex gap-2", it.role === "user" ? "justify-end" : "justify-start")}>
              {it.role === "assistant" && <CoachAvatar mood={it.streaming && !it.text ? "thinking" : it.error ? "sad" : "idle"} size={32} className="mt-1 shrink-0" />}
              <div className={cn("max-w-[85%]", it.role === "user" && "items-end")}>
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-line",
                    it.role === "user" ? "rounded-br-md bg-primary text-primary-foreground" : "glass rounded-bl-md text-foreground",
                    it.error && "border-destructive/40",
                  )}
                >
                  {it.text}
                  {it.streaming && !it.text && (
                    <span className="flex gap-1 py-1" aria-label="Coach tippt">
                      {[0, 1, 2].map((i) => (
                        <motion.span key={i} className="size-2 rounded-full bg-muted-foreground" animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />
                      ))}
                    </span>
                  )}
                  {it.streaming && it.text && <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-primary align-middle" />}
                </div>
                {it.role === "assistant" && it.citations.length > 0 && (
                  <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto pb-1">
                    {it.citations.map((c, i) => (
                      <motion.div key={c.id} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ ...spring, delay: 0.1 + i * 0.07 }} className="w-56 shrink-0">
                        <Link href={`/fragen/${c.id}`} className="glass glow-hover block h-full rounded-xl p-3 text-xs">
                          <span className="font-bold text-link">
                            [{i + 1}] {c.category}
                          </span>
                          <span className="mt-1 line-clamp-3 block text-foreground/85">{c.text}</span>
                          <span className="mt-2 inline-flex items-center gap-1 font-semibold text-link">
                            Frage üben <ArrowRight className="size-3" />
                          </span>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                )}
                {it.role === "assistant" && !it.streaming && !it.error && <Feedback item={it} />}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={endRef} />
      </div>

      {/* Eingabe */}
      <div className="fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-20 px-3 lg:bottom-4 lg:left-72">
        <div className="mx-auto max-w-3xl space-y-2">
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            {CHIPS.map((c, i) => (
              <motion.button
                key={c}
                type="button"
                disabled={busy || remaining === 0}
                onClick={() => void send(c)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: i * 0.05 }}
                whileTap={{ scale: 0.95 }}
                className="glass shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-navy disabled:opacity-50"
              >
                {c}
              </motion.button>
            ))}
          </div>
          <form
            className="glass flex items-end gap-2 rounded-2xl bg-card-solid/90 p-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              rows={1}
              maxLength={1000}
              placeholder={remaining === 0 ? "Tageslimit erreicht – morgen geht's weiter" : "Frag deinen Coach …"}
              disabled={remaining === 0}
              aria-label="Nachricht an den Coach"
              className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] outline-none placeholder:text-muted-foreground"
            />
            <Button type="submit" size="icon" disabled={busy || !input.trim() || remaining === 0} aria-label="Senden">
              <Send />
            </Button>
          </form>
          <p className="text-center text-[10px] text-muted-foreground">Der Coach kann sich irren – im Zweifel im offiziellen Fragenkatalog oder bei der WKO nachprüfen.</p>
        </div>
      </div>
    </div>
  );
}
