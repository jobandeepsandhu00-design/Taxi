"use client";

import { useEffect } from "react";
import { heartbeatAction } from "@/server/actions/learning";

const INTERVAL = 30;

/** Erfasst die aktive Lernzeit: alle 30 Sekunden, solange der Tab sichtbar ist und der Nutzer aktiv war. */
export function StudyHeartbeat() {
  useEffect(() => {
    let lastActivity = Date.now();
    const mark = () => (lastActivity = Date.now());
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }));
    const id = window.setInterval(() => {
      const idle = Date.now() - lastActivity > 3 * 60_000;
      if (document.visibilityState === "visible" && !idle) {
        heartbeatAction(INTERVAL).catch(() => {});
      }
    }, INTERVAL * 1000);
    return () => {
      window.clearInterval(id);
      events.forEach((e) => window.removeEventListener(e, mark));
    };
  }, []);
  return null;
}
