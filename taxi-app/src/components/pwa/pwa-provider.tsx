"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { isInAppBrowser, isIOS, isMobile, isStandalone, pushSupported, store } from "@/lib/platform";
import { permission, setBadge, syncPush } from "@/lib/push/client";
import { InstallSheet } from "./install-sheet";
import { PushAsk } from "./push-ask";
import { installEvent } from "./pwa-events";

const WEEK = 7 * 86400_000;
type Gate = "install" | "push";

function gateOpen(key: Gate): boolean {
  try {
    const v = JSON.parse(store.get(`tp-gate-${key}`) ?? "{}") as { n?: number; until?: number };
    return (v.n ?? 0) < 3 && Date.now() > (v.until ?? 0);
  } catch {
    return true;
  }
}
function gateDismiss(key: Gate) {
  let n = 0;
  try {
    n = (JSON.parse(store.get(`tp-gate-${key}`) ?? "{}") as { n?: number }).n ?? 0;
  } catch {
    /* leer */
  }
  store.set(`tp-gate-${key}`, JSON.stringify({ n: n + 1, until: Date.now() + WEEK }));
}

/** Zählt Besuche (pro Sitzung einmal) und merkt den ersten Besuch. */
function trackVisit(): { visits: number; firstSeen: number } {
  let visits = Number(store.get("tp-visits") ?? "0") || 0;
  let first = Number(store.get("tp-first-seen") ?? "0") || 0;
  if (!first) {
    first = Date.now();
    store.set("tp-first-seen", String(first));
  }
  let counted = false;
  try {
    counted = sessionStorage.getItem("tp-visit") === "1";
    sessionStorage.setItem("tp-visit", "1");
  } catch {
    /* ignorieren */
  }
  if (!counted) {
    visits += 1;
    store.set("tp-visits", String(visits));
  }
  return { visits, firstSeen: first };
}

/** Bedeutsamer Moment: erste Lektion/Quiz fertig, Prüfungstermin gesetzt, Serie gestartet. */
function detectMoment(s: { done: number; exam: boolean; streak: number }): boolean {
  const raw = store.get("tp-moment-state");
  store.set("tp-moment-state", JSON.stringify(s));
  if (!raw) return false;
  try {
    const p = JSON.parse(raw) as { done: number; exam: boolean; streak: number };
    return (p.done === 0 && s.done > 0) || (!p.exam && s.exam) || (p.streak === 0 && s.streak > 0);
  } catch {
    return false;
  }
}

export function PwaProvider({ vapidKey, due, done, hasExamDate, streak }: { vapidKey: string | null; due: number; done: number; hasExamDate: boolean; streak: number }) {
  const [installOpen, setInstallOpen] = useState(false);
  const [installReason, setInstallReason] = useState<"manual" | "push" | "auto">("auto");
  const [pushOpen, setPushOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const auto = useRef<Gate | null>(null);

  const canPush = useCallback(() => Boolean(vapidKey) && pushSupported() && permission() === "default" && !(isIOS() && !isStandalone()), [vapidKey]);

  // Abo prüfen + App-Badge
  useEffect(() => {
    void syncPush(vapidKey);
  }, [vapidKey]);
  useEffect(() => {
    setBadge(due);
  }, [due]);

  // Automatisch anbieten – nie im ersten Besuch innerhalb der ersten 30 Sekunden
  useEffect(() => {
    // Automatisierte Tests: nur mit ausdrücklicher Freigabe automatisch anbieten
    if (navigator.webdriver && store.get("tp-pwa-auto") !== "1") return;
    const { visits, firstSeen } = trackVisit();
    const moment = detectMoment({ done, exam: hasExamDate, streak });
    const standalone = isStandalone();
    const show = (g: Gate, reason: "auto" | "push" = "auto") => {
      auto.current = g;
      if (g === "push") setPushOpen(true);
      else {
        setInstallReason(reason);
        setInstallOpen(true);
      }
    };
    const decide = () => {
      if (moment) {
        if (canPush() && gateOpen("push")) return show("push");
        if (!standalone && isMobile() && gateOpen("install")) return show("install", isIOS() ? "push" : "auto");
        return;
      }
      if (visits >= 2 && !standalone && isMobile() && gateOpen("install") && (isIOS() || installEvent() || isInAppBrowser())) show("install");
    };
    const wait = Math.max(moment ? 1200 : 8000, firstSeen + 30_000 - Date.now());
    const t = window.setTimeout(decide, wait);
    return () => window.clearTimeout(t);
    // nur beim Laden/bei Änderungen der Kennzahlen
  }, [done, hasExamDate, streak, canPush]);

  // Manuelle Einstiege (Profil, Chip) und Installations-Ereignisse
  useEffect(() => {
    const onInstall = (e: Event) => {
      auto.current = null;
      setInstallReason(((e as CustomEvent).detail?.reason as "manual" | "push") ?? "manual");
      setInstallOpen(true);
    };
    const onPush = () => {
      auto.current = null;
      if (isIOS() && !isStandalone()) {
        setInstallReason("push");
        setInstallOpen(true);
      } else setPushOpen(true);
    };
    const onInstalled = () => {
      setInstallOpen(false);
      setToast("Danke! TaxiFit ist jetzt installiert 🎉");
      window.setTimeout(() => setToast(null), 3500);
    };
    window.addEventListener("tp-open-install", onInstall);
    window.addEventListener("tp-open-push", onPush);
    window.addEventListener("tp-installed", onInstalled);
    return () => {
      window.removeEventListener("tp-open-install", onInstall);
      window.removeEventListener("tp-open-push", onPush);
      window.removeEventListener("tp-installed", onInstalled);
    };
  }, []);

  const close = (g: Gate) => {
    if (auto.current === g) gateDismiss(g);
    auto.current = null;
    if (g === "install") setInstallOpen(false);
    else setPushOpen(false);
  };

  return (
    <>
      <InstallSheet open={installOpen} reason={installReason} onClose={() => close("install")} onInstalled={() => window.dispatchEvent(new Event("tp-installed"))} />
      {vapidKey && <PushAsk open={pushOpen} vapidKey={vapidKey} onClose={() => close("push")} onDone={() => (auto.current = null)} />}
      <AnimatePresence>
        {toast && (
          <motion.div role="status" className="fixed inset-x-3 top-[calc(env(safe-area-inset-top,0px)+10px)] z-[70] mx-auto max-w-md rounded-2xl bg-[#111] p-3 text-center text-sm font-bold text-white shadow-2xl" initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -60, opacity: 0 }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
