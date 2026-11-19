"use client";

import { useEffect, useRef } from "react";
import type { FormState } from "@/server/actions/auth";
import { useScene } from "./auth-scene";

/** Verbindet ein Formular-Ergebnis mit der Szene: Fehler → Karte schütteln, Erfolg → Taxi fährt ab. */
export function useSceneForm(state: FormState) {
  const { shake, depart } = useScene();
  const last = useRef<FormState | null>(null);
  useEffect(() => {
    if (state === last.current) return;
    last.current = state;
    if (state.redirectTo) depart(state.redirectTo);
    else if (state.error) shake();
  }, [state, shake, depart]);
}
