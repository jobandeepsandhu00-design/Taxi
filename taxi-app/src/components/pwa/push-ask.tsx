"use client";

import { motion } from "motion/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { CoachAvatar } from "@/components/coach/coach-avatar";
import { isIOS } from "@/lib/platform";
import { enablePush } from "@/lib/push/client";
import { Sheet } from "./sheet";

const EXAMPLES = [
  { t: "🔁 12 Fragen sind heute fällig", s: "kurz wiederholen?" },
  { t: "🔥 Deine 5-Tage-Serie ist in Gefahr!", s: "Eine Lektion reicht." },
  { t: "📅 Noch 7 Tage bis zur Prüfung", s: "Prüfungsreife: 78 %" },
];

export function DeniedHelp() {
  return (
    <div className="rounded-2xl bg-[#f5f5f5] p-3 text-xs text-[#374151] dark:bg-white/5 dark:text-white/80" data-testid="push-denied-help">
      <p className="font-bold">Benachrichtigungen sind blockiert.</p>
      {isIOS() ? (
        <p className="mt-1">iPhone: Einstellungen → Mitteilungen → TaxiFit → „Mitteilungen erlauben“ einschalten.</p>
      ) : (
        <p className="mt-1">Android: App-Info von TaxiFit (Symbol lange drücken → ⓘ) → Benachrichtigungen → erlauben. Im Browser: Schloss-Symbol neben der Adresse → Benachrichtigungen → Zulassen.</p>
      )}
    </div>
  );
}

/** Sanfte Vorab-Frage: erst nach „Ja“ fragt der Browser nach der Erlaubnis. */
export function PushAsk({ open, onClose, vapidKey, onDone }: { open: boolean; onClose: () => void; vapidKey: string; onDone: (ok: boolean) => void }) {
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<"ask" | "denied" | "ok" | "error">("ask");
  return (
    <Sheet open={open} onClose={onClose} label="Erinnerungen aktivieren" testId="push-ask">
      {state === "ok" ? (
        <div className="py-4 text-center">
          <CoachAvatar mood="happy" size={72} className="mx-auto" />
          <p className="mt-3 text-lg font-extrabold">Super, ich erinnere dich! 🚕</p>
          <p className="mt-1 text-sm text-[#6b7280] dark:text-white/60">Uhrzeit und Arten änderst du jederzeit im Profil.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 pr-10">
            <CoachAvatar mood="idle" size={60} />
            <h2 className="text-lg leading-tight font-extrabold">Soll ich dich ans Lernen erinnern?</h2>
          </div>
          <ul className="mt-4 space-y-2" aria-label="Beispiele">
            {EXAMPLES.map((e, i) => (
              <motion.li
                key={e.t}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.12 }}
                className="flex items-center gap-3 rounded-2xl bg-[#f5f5f5] p-3 dark:bg-white/5"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#ffc400] text-sm">🚕</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{e.t}</span>
                  <span className="block text-xs text-[#6b7280] dark:text-white/60">{e.s}</span>
                </span>
              </motion.li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[#6b7280] dark:text-white/60">Höchstens 2 am Tag, nie nachts (22–8 Uhr).</p>
          {state === "denied" && (
            <div className="mt-3">
              <DeniedHelp />
            </div>
          )}
          {state === "error" && <p className="mt-3 text-xs font-semibold text-[#dc2626]">Hat nicht geklappt – versuch es später im Profil erneut.</p>}
          <div className="mt-4 grid grid-cols-1 gap-2">
            <button
              type="button"
              disabled={busy}
              data-testid="push-ask-yes"
              onClick={async () => {
                setBusy(true);
                const r = await enablePush(vapidKey);
                setBusy(false);
                if (r.ok) {
                  setState("ok");
                  onDone(true);
                  window.setTimeout(onClose, 1800);
                } else setState(r.state === "denied" ? "denied" : "error");
              }}
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#ffc400] text-base font-extrabold text-[#111] active:scale-[0.98] disabled:opacity-70"
            >
              {busy && <Loader2 className="size-4 animate-spin" />} Ja, erinnere mich
            </button>
            <button type="button" onClick={onClose} className="min-h-11 rounded-2xl text-sm font-bold text-[#6b7280] hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10" data-testid="push-ask-later">
              Später
            </button>
          </div>
        </>
      )}
    </Sheet>
  );
}
