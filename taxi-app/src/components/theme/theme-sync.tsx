"use client";

import { useEffect } from "react";
import { applyTheme, getThemeState } from "@/lib/theme/client";
import { isThemeId, isThemeMode } from "@/lib/theme/themes";

/** Übernimmt das im Profil gespeicherte Design, wenn dieses Gerät noch keine Auswahl dieses Nutzers kennt. */
export function ThemeSync({ uid, theme, mode, helperLang }: { uid: string; theme: string; mode: string; helperLang?: string | null }) {
  useEffect(() => {
    // Hilfssprache aus dem Profil übernehmen, wenn auf dem Gerät noch keine gewählt ist
    try {
      if (helperLang && !localStorage.getItem("tp-lang")) localStorage.setItem("tp-lang", helperLang);
    } catch {
      /* ignorieren */
    }
  }, [helperLang]);
  useEffect(() => {
    const s = getThemeState();
    if (s.uid === uid) return;
    applyTheme({ theme: isThemeId(theme) ? theme : s.theme, mode: isThemeMode(mode) ? mode : s.mode, uid });
  }, [uid, theme, mode]);
  return null;
}
