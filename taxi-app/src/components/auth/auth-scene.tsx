"use client";

import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import { createContext, useCallback, useContext, useState } from "react";
import { AnimatedLogo } from "./animated-logo";
import { TaxiDrive } from "./taxi-drive";
import { ViennaSkyline } from "./vienna-skyline";

interface SceneApi {
  /** Karte schütteln (Fehleingabe) */
  shake: () => void;
  /** Taxi beschleunigt aus dem Bild, gelber Wipe – danach wird `href` geöffnet */
  depart: (href: string) => void;
}

const SceneContext = createContext<SceneApi>({
  shake: () => undefined,
  depart: (href) => window.location.assign(href),
});

export const useScene = () => useContext(SceneContext);

/**
 * Vollbild-Szene „Wien bei Nacht" für Login, Registrierung und Startseite.
 * `children` erscheint im Glas-Bottom-Sheet (mobil) bzw. als schwebende Karte (Desktop).
 */
export function AuthScene({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  const card = useAnimationControls();
  const [leaving, setLeaving] = useState(false);

  const shake = useCallback(() => {
    void card.start({ x: [0, -14, 12, -8, 6, -3, 0], transition: { duration: 0.45, ease: "easeOut" } });
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.([20, 40, 20]);
  }, [card]);

  const depart = useCallback(
    (href: string) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        window.location.assign(href);
        return;
      }
      setLeaving(true);
      void card.start({ y: 40, opacity: 0, transition: { duration: 0.3 } });
      window.setTimeout(() => window.location.assign(href), 1050);
    },
    [card],
  );

  return (
    <SceneContext.Provider value={{ shake, depart }}>
      <div className="dark relative min-h-dvh overflow-x-clip bg-night text-foreground">
        {/* Szene: mobil obere Bildschirmhälfte, Desktop vollflächig */}
        <div className="fixed inset-x-0 top-0 h-[46svh] min-h-[300px] lg:h-dvh">
          <ViennaSkyline />
          <TaxiDrive leaving={leaving} />
          <div className="absolute top-0 left-0 px-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8 sm:pt-8">
            <AnimatedLogo />
          </div>
          {aside && (
            <div className="absolute top-32 left-8 hidden max-w-[34rem] rounded-3xl bg-night/45 p-6 backdrop-blur-md lg:block xl:left-14">{aside}</div>
          )}
        </div>

        {/* Inhalt */}
        <div className="relative z-10 flex min-h-dvh flex-col lg:items-end lg:justify-center lg:px-16 xl:px-24">
          <div className="h-[calc(46svh-14px)] min-h-[286px] shrink-0 lg:hidden" />
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 210, damping: 26, delay: 0.25 }}
            className="flex-1 lg:flex-none"
          >
            <motion.div
              animate={card}
              className="pb-safe h-full rounded-t-[32px] border border-b-0 border-white/10 bg-[#121827]/80 px-5 pt-3 shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-2xl sm:px-8 lg:w-[440px] lg:rounded-3xl lg:border-b lg:pt-8 lg:pb-8"
            >
              <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-white/15 lg:hidden" />
              {children}
            </motion.div>
          </motion.div>
        </div>

        {/* Gelber Wipe nach erfolgreicher Anmeldung */}
        <AnimatePresence>
          {leaving && (
            <motion.div
              className="fixed inset-0 z-50 origin-left bg-primary"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.5, duration: 0.45, ease: [0.7, 0, 0.3, 1] }}
            />
          )}
        </AnimatePresence>
      </div>
    </SceneContext.Provider>
  );
}
