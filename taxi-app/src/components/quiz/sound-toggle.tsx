"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { playSound, setSoundEnabled, soundEnabled } from "@/lib/sound";

/** Ton an/aus (gespeichert im Browser). */
export function SoundToggle() {
  const [on, setOn] = useState(true);
  useEffect(() => setOn(soundEnabled()), []);
  return (
    <button
      type="button"
      onClick={() => {
        const next = !on;
        setOn(next);
        setSoundEnabled(next);
        if (next) playSound("correct");
      }}
      aria-pressed={on}
      aria-label={on ? "Ton ausschalten" : "Ton einschalten"}
      title={on ? "Ton aus" : "Ton an"}
      className="glass flex size-9 items-center justify-center rounded-xl text-foreground/75 transition hover:text-foreground active:scale-95"
    >
      {on ? <Volume2 className="size-[18px]" /> : <VolumeX className="size-[18px]" />}
    </button>
  );
}
