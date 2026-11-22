"use client";

import { AnimatePresence, motion } from "motion/react";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { InstallEvent } from "./pwa-events";

/**
 * Registriert den Service Worker, fängt das Installations-Ereignis früh ab
 * und zeigt „Neue Version verfügbar – Aktualisieren“, sobald ein neuer SW wartet.
 */
export function ServiceWorkerRegister() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      window.__tpInstall = e as InstallEvent;
      window.dispatchEvent(new Event("tp-install-ready"));
    };
    const onInstalled = () => {
      window.__tpInstall = null;
      window.dispatchEvent(new Event("tp-installed"));
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    const enabled = process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_SW_DEV === "1";
    if (enabled && "serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (e) => {
        if (e.data?.type === "navigate" && typeof e.data.url === "string" && e.data.url.startsWith("/")) window.location.href = e.data.url;
      });
      let reloading = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloading) return;
        reloading = true;
        window.location.reload();
      });
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          const watch = (w: ServiceWorker | null) => {
            if (!w) return;
            w.addEventListener("statechange", () => {
              if (w.state === "installed" && navigator.serviceWorker.controller) setWaiting(w);
            });
          };
          if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
          watch(reg.installing);
          reg.addEventListener("updatefound", () => watch(reg.installing));
          // Beim Zurückkehren in die App nach Updates schauen
          const check = () => document.visibilityState === "visible" && reg.update().catch(() => undefined);
          document.addEventListener("visibilitychange", check);
        })
        .catch(() => {
          /* optional – App funktioniert auch ohne */
        });
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return (
    <AnimatePresence>
      {waiting && (
        <motion.div
          role="status"
          data-testid="sw-update"
          className="fixed inset-x-3 top-[calc(env(safe-area-inset-top,0px)+10px)] z-[70] mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-[#111] p-3 pl-4 text-white shadow-2xl"
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
        >
          <RefreshCw className="size-5 shrink-0 text-[#ffc400]" />
          <span className="min-w-0 flex-1 text-sm font-semibold">Neue Version verfügbar</span>
          <button type="button" onClick={() => waiting.postMessage({ type: "skip-waiting" })} className="min-h-10 rounded-xl bg-[#ffc400] px-4 text-sm font-extrabold text-[#111] active:scale-95">
            Aktualisieren
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
