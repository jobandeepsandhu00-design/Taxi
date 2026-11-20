"use client";

import { motion } from "motion/react";
import { Languages, Music2, Smartphone, Volume2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { TRANSLATE_LANGS } from "@/components/quiz/translate-sheet";
import { ReduceMotionToggle } from "@/components/theme/theme-picker";
import { AVATARS } from "@/lib/avatars";
import { haptic, spring } from "@/lib/motion";
import { playSound, setSoundEnabled, soundEnabled } from "@/lib/sound";
import { audioModeEnabled, setAudioMode, speak, speechSupported } from "@/lib/speech";
import { cn } from "@/lib/utils";
import { setAvatarAction } from "@/server/actions/auth";
import { PushToggle } from "./push-toggle";

/** Avatar-Auswahl mit Feder-Animation. */
export function AvatarPicker({ initial }: { initial: string | null }) {
  const [selected, setSelected] = useState(initial ?? "taxi");
  const [, start] = useTransition();
  return (
    <div role="radiogroup" aria-label="Avatar" className="grid grid-cols-4 gap-3 sm:grid-cols-6">
      {AVATARS.map((a) => {
        const active = selected === a.key;
        return (
          <motion.button
            key={a.key}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={a.label}
            title={a.label}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              haptic();
              setSelected(a.key);
              start(() => void setAvatarAction(a.key));
            }}
            className={cn("relative flex aspect-square items-center justify-center rounded-2xl border text-3xl transition-colors", active ? "border-primary bg-primary/12" : "border-border bg-muted hover:border-primary/40")}
          >
            {active && <motion.span layoutId="avatar-ring" className="absolute inset-0 rounded-2xl ring-2 ring-primary shadow-[0_0_24px_-6px_var(--glow)]" transition={spring} />}
            <motion.span animate={{ scale: active ? 1.15 : 1, rotate: active ? [0, -10, 10, 0] : 0 }} transition={{ duration: 0.4 }}>
              {a.emoji}
            </motion.span>
          </motion.button>
        );
      })}
    </div>
  );
}

function Switch({ checked, onChange, label, description, icon: Icon, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; description: string; icon: typeof Volume2; disabled?: boolean }) {
  return (
    <label className={cn("flex items-center gap-3 py-3", disabled && "opacity-50")}>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-link">
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-navy">{label}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", checked ? "bg-primary" : "bg-foreground/20")}
      >
        <motion.span className="absolute top-1 left-1 size-5 rounded-full bg-white shadow" animate={{ x: checked ? 20 : 0 }} transition={spring} />
      </button>
    </label>
  );
}

/** Geräte-Einstellungen (im Browser gespeichert). */
export function DeviceSettings({ vapidKey }: { vapidKey: string | null }) {
  const [sound, setSound] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [audio, setAudio] = useState(false);
  const [lang, setLang] = useState("en");
  const [canSpeak, setCanSpeak] = useState(false);

  useEffect(() => {
    setSound(soundEnabled());
    setAudio(audioModeEnabled());
    setCanSpeak(speechSupported());
    try {
      setHaptics(localStorage.getItem("tp-haptics") !== "off");
      setLang(localStorage.getItem("tp-lang") ?? "en");
    } catch {
      /* ignorieren */
    }
  }, []);

  return (
    <div className="divide-y divide-border">
      <div className="py-2">
        <ReduceMotionToggle />
      </div>
      <Switch
        icon={Music2}
        label="Soundeffekte"
        description="Kurze Töne bei richtig, falsch und Level-Aufstieg"
        checked={sound}
        onChange={(v) => {
          setSound(v);
          setSoundEnabled(v);
          if (v) playSound("correct");
        }}
      />
      <Switch
        icon={Smartphone}
        label="Haptisches Feedback"
        description="Kurze Vibration bei Tippen (wenn vom Gerät unterstützt)"
        checked={haptics}
        onChange={(v) => {
          setHaptics(v);
          try {
            localStorage.setItem("tp-haptics", v ? "on" : "off");
          } catch {
            /* ignorieren */
          }
          if (v) haptic(15);
        }}
      />
      <Switch
        icon={Volume2}
        label="Audio-Modus"
        description={canSpeak ? "Fragen automatisch vorlesen (de-AT) – z. B. unterwegs als Beifahrer:in" : "Dein Browser unterstützt kein Vorlesen"}
        checked={audio}
        disabled={!canSpeak}
        onChange={(v) => {
          setAudio(v);
          setAudioMode(v);
          if (v) speak("Audio-Modus ist eingeschaltet.");
        }}
      />
      <PushToggle vapidKey={vapidKey} />
      <label className="flex items-center gap-3 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-link">
          <Languages className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-navy">Übersetzungshilfe</span>
          <span className="block text-xs text-muted-foreground">Bevorzugte Sprache (Frage lange drücken)</span>
        </span>
        <select
          value={lang}
          onChange={(e) => {
            setLang(e.target.value);
            try {
              localStorage.setItem("tp-lang", e.target.value);
            } catch {
              /* ignorieren */
            }
          }}
          className="h-10 rounded-xl border border-input bg-muted px-2 text-sm text-foreground"
          aria-label="Bevorzugte Übersetzungssprache"
        >
          {TRANSLATE_LANGS.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
