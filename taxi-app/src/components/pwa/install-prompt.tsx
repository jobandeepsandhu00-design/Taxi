"use client";

import { AnimatePresence, motion } from "motion/react";
import { Share, X } from "lucide-react";
import { useEffect, useState } from "react";
import { TaxiGlyph } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { spring } from "@/lib/motion";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

const KEY = "tp-install-dismissed";

/** Animierte Einladung, die App zu installieren (Android/Chrome) bzw. Anleitung für iPhone. */
export function InstallPrompt() {
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
    let dismissed = false;
    try {
      const v = localStorage.getItem(KEY);
      dismissed = Boolean(v && Date.now() - Number(v) < 14 * 86400_000);
    } catch {
      /* ignorieren */
    }
    if (standalone || dismissed) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as InstallEvent);
      window.setTimeout(() => setShow(true), 4000);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
    if (isIos) {
      setIos(true);
      const t = window.setTimeout(() => setShow(true), 6000);
      return () => {
        window.clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onPrompt);
      };
    }
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      /* ignorieren */
    }
  }

  return (
    <AnimatePresence>
      {show && (evt || ios) && (
        <motion.div
          role="dialog"
          aria-label="App installieren"
          className="glass fixed inset-x-3 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md rounded-2xl bg-card-solid/95 p-4 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] lg:bottom-6"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={spring}
        >
          <button type="button" onClick={dismiss} className="absolute top-3 right-3 rounded-lg p-1 text-muted-foreground hover:text-foreground" aria-label="Schließen">
            <X className="size-4" />
          </button>
          <div className="flex items-center gap-3">
            <motion.span
              className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_0_24px_-4px_rgba(255,196,0,0.7)]"
              animate={{ y: [0, -6, 0], rotate: [0, -6, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1.5 }}
            >
              <TaxiGlyph className="size-6" />
            </motion.span>
            <div className="min-w-0 flex-1 pr-5">
              <p className="font-bold text-navy">TaxiPrüfung installieren</p>
              <p className="text-xs text-muted-foreground">
                {ios ? (
                  <>
                    Tippe auf <Share className="inline size-3.5" /> „Teilen“ und dann „Zum Home-Bildschirm“.
                  </>
                ) : (
                  "Schneller Start vom Homescreen, Vollbild und Offline-Pakete."
                )}
              </p>
            </div>
          </div>
          {evt && (
            <Button
              className="mt-3 w-full"
              onClick={async () => {
                await evt.prompt();
                await evt.userChoice.catch(() => null);
                setEvt(null);
                dismiss();
              }}
            >
              Jetzt installieren
            </Button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
