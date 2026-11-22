"use client";

import { motion } from "motion/react";
import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQuestionAudio } from "@/components/audio/use-question-audio";
import { audioEngine } from "@/lib/audio/player";
import { audioModeEnabled } from "@/lib/speech";
import { cn } from "@/lib/utils";

/**
 * Liest die Frage samt Antwortmöglichkeiten vor – mit den vorproduzierten Studio-Audios
 * (Frage + „Antwortmöglichkeiten A–D“), sonst mit der Gerätestimme. Im Audio-Modus automatisch.
 */
export function SpeakButton({ text, auto = true, questionId, optionsText }: { text: string; auto?: boolean; questionId?: string; optionsText?: string }) {
  const [speaking, setSpeaking] = useState(false);
  const { get } = useQuestionAudio();
  const run = useRef(0);

  async function play() {
    const my = ++run.current;
    const engine = audioEngine();
    setSpeaking(true);
    const set = questionId ? await get(questionId) : {};
    if (my !== run.current) return;
    if (set.question) {
      await engine.play(set.question);
      if (my !== run.current) return;
      if (set.options) await engine.play(set.options);
      else if (optionsText) await engine.speak(optionsText);
    } else {
      await engine.speak(text);
    }
    if (my === run.current) setSpeaking(false);
  }

  function stop() {
    run.current++;
    audioEngine().stop();
    setSpeaking(false);
  }

  useEffect(() => {
    const r = run;
    if (auto && audioModeEnabled()) void play();
    return () => {
      r.current++;
      audioEngine().stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, auto]);

  return (
    <button
      type="button"
      onClick={() => (speaking ? stop() : void play())}
      aria-pressed={speaking}
      aria-label={speaking ? "Vorlesen stoppen" : "Frage vorlesen"}
      title={speaking ? "Stopp" : "Vorlesen"}
      className={cn("relative flex size-9 items-center justify-center rounded-xl border transition-colors", speaking ? "border-primary/50 bg-primary/12 text-primary" : "glass text-muted-foreground hover:text-navy")}
    >
      {speaking && <motion.span className="absolute inset-0 rounded-xl border-2 border-primary" animate={{ scale: [1, 1.25], opacity: [0.8, 0] }} transition={{ duration: 1.1, repeat: Infinity }} />}
      {speaking ? <VolumeX className="size-[18px]" /> : <Volume2 className="size-[18px]" />}
    </button>
  );
}
