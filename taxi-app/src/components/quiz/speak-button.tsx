"use client";

import { motion } from "motion/react";
import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { audioModeEnabled, speak, speechSupported, stopSpeaking } from "@/lib/speech";
import { cn } from "@/lib/utils";

/** Liest die Frage samt Antwortmöglichkeiten vor; im Audio-Modus automatisch. */
export function SpeakButton({ text, auto = true }: { text: string; auto?: boolean }) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSupported(speechSupported());
    if (auto && speechSupported() && audioModeEnabled()) {
      setSpeaking(true);
      speak(text, () => setSpeaking(false));
    }
    return () => stopSpeaking();
  }, [text, auto]);

  if (!supported) return null;
  return (
    <button
      type="button"
      onClick={() => {
        if (speaking) {
          stopSpeaking();
          setSpeaking(false);
        } else {
          setSpeaking(true);
          speak(text, () => setSpeaking(false));
        }
      }}
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
