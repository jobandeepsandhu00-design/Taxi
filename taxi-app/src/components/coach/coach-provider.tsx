"use client";

import { createContext, useContext } from "react";

const CoachContext = createContext<{ enabled: boolean }>({ enabled: false });

/** Stellt bereit, ob der KI-Coach eingerichtet ist (API-Schlüssel bzw. Testmodus). */
export function CoachProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  return <CoachContext.Provider value={{ enabled }}>{children}</CoachContext.Provider>;
}

export const useCoach = () => useContext(CoachContext);
