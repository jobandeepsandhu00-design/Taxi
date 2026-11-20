"use client";

import { useEffect } from "react";
import { applyTheme, getThemeState } from "@/lib/theme/client";
import { isThemeId, isThemeMode } from "@/lib/theme/themes";

/** Übernimmt das im Profil gespeicherte Design, wenn dieses Gerät noch keine Auswahl dieses Nutzers kennt. */
export function ThemeSync({ uid, theme, mode }: { uid: string; theme: string; mode: string }) {
  useEffect(() => {
    const s = getThemeState();
    if (s.uid === uid) return;
    applyTheme({ theme: isThemeId(theme) ? theme : s.theme, mode: isThemeMode(mode) ? mode : s.mode, uid });
  }, [uid, theme, mode]);
  return null;
}
