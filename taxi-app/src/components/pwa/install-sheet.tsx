"use client";

import { motion, useReducedMotion } from "motion/react";
import { BellRing, Check, Copy, Maximize2, PlusSquare, Share, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { TaxiFitMark } from "@/components/brand/taxifit-mark";
import { isIOS, isIOSNonSafari, isInAppBrowser } from "@/lib/platform";
import { installEvent } from "./pwa-events";
import { Sheet } from "./sheet";

type Variant = "android" | "ios" | "ios-other" | "inapp" | "manual";

export function detectVariant(): Variant {
  if (isInAppBrowser()) return "inapp";
  if (isIOSNonSafari()) return "ios-other";
  if (isIOS()) return "ios";
  return installEvent() ? "android" : "manual";
}

const SITE = "taxi-pruefung.vercel.app";

function CopyLink() {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(`https://${SITE}`);
          setDone(true);
        } catch {
          /* ignorieren */
        }
      }}
      className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#111] text-sm font-extrabold text-white active:scale-[0.98] dark:bg-white dark:text-[#111]"
    >
      {done ? <Check className="size-4" /> : <Copy className="size-4" />} {done ? "Link kopiert" : "Link kopieren"}
    </button>
  );
}

/** Animierte Mini-Illustrationen für die iPhone-Anleitung */
function StepArt({ step, active }: { step: number; active: boolean }) {
  const reduce = useReducedMotion();
  const loop = active && !reduce;
  if (step === 0)
    return (
      <div className="relative flex h-20 items-end justify-center overflow-hidden rounded-2xl bg-[#f2f2f7] dark:bg-white/5">
        <div className="flex h-9 w-full items-center justify-around border-t border-black/5 bg-white/90 px-6 text-[#2563eb] dark:border-white/10 dark:bg-white/10">
          <span className="text-lg">‹</span>
          <span className="text-lg opacity-40">›</span>
          <motion.span animate={loop ? { scale: [1, 1.25, 1] } : undefined} transition={{ duration: 1.2, repeat: Infinity }} className="rounded-lg bg-[#2563eb]/15 p-1">
            <Share className="size-5" />
          </motion.span>
          <span className="text-sm opacity-40">▢</span>
          <span className="text-sm opacity-40">⧉</span>
        </div>
        <motion.span aria-hidden className="absolute top-1.5 left-1/2 -translate-x-1/2 text-xl" animate={loop ? { y: [0, 8, 0] } : undefined} transition={{ duration: 1.2, repeat: Infinity }}>
          👇
        </motion.span>
      </div>
    );
  if (step === 1)
    return (
      <div className="h-20 overflow-hidden rounded-2xl bg-[#f2f2f7] p-2 dark:bg-white/5">
        <motion.div animate={loop ? { y: [0, -26, -26, 0] } : undefined} transition={{ duration: 3, repeat: Infinity, times: [0, 0.35, 0.8, 1] }} className="space-y-1.5">
          {["Kopieren", "Zur Leseliste", "Zum Home-Bildschirm", "Lesezeichen"].map((t) => (
            <div key={t} className={`flex h-6 items-center justify-between rounded-lg px-2 text-[11px] font-semibold ${t === "Zum Home-Bildschirm" ? "bg-[#ffc400] text-[#111]" : "bg-white text-[#111]/70 dark:bg-white/10 dark:text-white/70"}`}>
              {t}
              {t === "Zum Home-Bildschirm" && <PlusSquare className="size-3.5" />}
            </div>
          ))}
        </motion.div>
      </div>
    );
  return (
    <div className="flex h-20 items-start justify-between rounded-2xl bg-[#f2f2f7] p-3 text-[12px] font-semibold dark:bg-white/5">
      <span className="text-[#2563eb]">Abbrechen</span>
      <span className="flex items-center gap-1.5">
        <TaxiFitMark size={20} /> TaxiFit
      </span>
      <motion.span animate={loop ? { scale: [1, 1.15, 1] } : undefined} transition={{ duration: 1, repeat: Infinity }} className="rounded-md bg-[#2563eb] px-2 py-0.5 text-white">
        Hinzufügen
      </motion.span>
    </div>
  );
}

const IOS_STEPS = [
  { title: "Teilen antippen", text: "Tippe in Safari auf das Teilen-Symbol (iPhone: unten in der Leiste, iPad: oben rechts)." },
  { title: "„Zum Home-Bildschirm“", text: "Scrolle im Menü nach unten und wähle „Zum Home-Bildschirm“." },
  { title: "„Hinzufügen“", text: "Tippe oben rechts auf „Hinzufügen“ – fertig! TaxiFit liegt jetzt auf deinem Home-Bildschirm." },
];

export function InstallSheet({ open, onClose, reason, onInstalled }: { open: boolean; onClose: () => void; reason: "manual" | "push" | "auto"; onInstalled: () => void }) {
  const [variant, setVariant] = useState<Variant>("manual");
  const [step, setStep] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (open) setVariant(detectVariant());
  }, [open]);
  useEffect(() => {
    if (!open || variant !== "ios" || reduce) return;
    const t = window.setInterval(() => setStep((s) => (s + 1) % 3), 2800);
    return () => window.clearInterval(t);
  }, [open, variant, reduce]);

  const header = (title: string, sub?: string) => (
    <div className="flex items-center gap-3 pr-10">
      <motion.span className="shrink-0 rounded-[14px] shadow-[0_8px_24px_-8px_rgba(255,196,0,.8)]" animate={reduce ? undefined : { y: [0, -4, 0] }} transition={{ duration: 1.6, repeat: Infinity }}>
        <TaxiFitMark size={52} />
      </motion.span>
      <div className="min-w-0">
        <h2 className="text-lg leading-tight font-extrabold">{title}</h2>
        {sub && <p className="text-xs text-[#6b7280] dark:text-white/60">{sub}</p>}
      </div>
    </div>
  );

  return (
    <Sheet open={open} onClose={onClose} label="App installieren" testId="install-sheet">
      {variant === "inapp" && (
        <>
          {header("Bitte im Browser öffnen", "Dieser In-App-Browser kann keine Apps installieren.")}
          <p className="mt-4 text-sm text-[#374151] dark:text-white/80">Tippe oben rechts auf „…“ und wähle <b>„Im Browser öffnen“</b> (iPhone: Safari, Android: Chrome). Oder kopiere den Link:</p>
          <CopyLink />
        </>
      )}
      {variant === "ios-other" && (
        <>
          {header("In Safari öffnen", "Auf dem iPhone geht die Installation nur mit Safari.")}
          <p className="mt-4 text-sm text-[#374151] dark:text-white/80">
            Öffne <b>{SITE}</b> in Safari, um die App zu installieren.
          </p>
          <CopyLink />
        </>
      )}
      {variant === "ios" && (
        <>
          {header("App auf dem iPhone installieren", "In 3 Schritten auf deinen Home-Bildschirm")}
          <ol className="mt-4 space-y-3">
            {IOS_STEPS.map((s, i) => (
              <li key={s.title}>
                <button type="button" onClick={() => setStep(i)} className={`w-full rounded-2xl border p-3 text-left transition ${step === i ? "border-[#ffc400] bg-[#ffc400]/10" : "border-black/5 dark:border-white/10"}`} data-testid={`ios-step-${i + 1}`}>
                  <div className="flex items-center gap-2">
                    <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${step === i ? "bg-[#ffc400] text-[#111]" : "bg-black/5 dark:bg-white/10"}`}>{i + 1}</span>
                    <span className="text-sm font-bold">{s.title}</span>
                  </div>
                  <p className="mt-1 pl-9 text-xs text-[#6b7280] dark:text-white/60">{s.text}</p>
                  {step === i && (
                    <div className="mt-2 pl-9">
                      <StepArt step={i} active />
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ol>
          <p className="mt-4 flex items-start gap-2 rounded-2xl bg-[#2563eb]/10 p-3 text-xs font-semibold text-[#1d4ed8] dark:text-[#93c5fd]">
            <BellRing className="mt-0.5 size-4 shrink-0" />
            {reason === "push" ? "Für Erinnerungen bitte zuerst installieren: " : ""}Push-Benachrichtigungen funktionieren auf dem iPhone nur in der installierten App.
          </p>
        </>
      )}
      {(variant === "android" || variant === "manual") && (
        <>
          {header("TaxiFit installieren", "Kostenlos · kein App Store nötig")}
          <ul className="mt-4 grid grid-cols-1 gap-2 min-[380px]:grid-cols-3">
            {[
              { icon: Maximize2, t: "Vollbild" },
              { icon: WifiOff, t: "Offline lernen" },
              { icon: BellRing, t: "Erinnerungen" },
            ].map((b) => (
              <li key={b.t} className="flex min-w-0 items-center gap-2 rounded-2xl bg-[#f5f5f5] p-3 text-xs font-bold min-[380px]:flex-col min-[380px]:text-center dark:bg-white/5">
                <b.icon className="size-5 shrink-0 text-[#2563eb]" /> {b.t}
              </li>
            ))}
          </ul>
          {variant === "android" ? (
            <button
              type="button"
              data-testid="install-confirm"
              onClick={async () => {
                const e = installEvent();
                if (!e) return;
                await e.prompt();
                const choice = await e.userChoice.catch(() => ({ outcome: "dismissed" as const }));
                window.__tpInstall = null;
                if (choice.outcome === "accepted") onInstalled();
                else onClose();
              }}
              className="mt-4 flex min-h-12 w-full items-center justify-center rounded-2xl bg-[#ffc400] text-base font-extrabold text-[#111] shadow-[0_10px_30px_-10px_rgba(255,196,0,.9)] active:scale-[0.98]"
            >
              Installieren
            </button>
          ) : (
            <p className="mt-4 rounded-2xl bg-[#f5f5f5] p-3 text-sm text-[#374151] dark:bg-white/5 dark:text-white/80">
              Öffne das Browser-Menü <b>⋮</b> und wähle <b>„App installieren“</b> bzw. <b>„Zum Startbildschirm hinzufügen“</b>.
            </p>
          )}
        </>
      )}
    </Sheet>
  );
}
