"use client";

import { motion } from "motion/react";
import { BellRing } from "lucide-react";
import { useEffect, useState } from "react";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { deletePushSubscriptionAction, savePushSubscriptionAction } from "@/server/actions/push";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** Web-Push für Serien-Erinnerungen ein-/ausschalten. */
export function PushToggle({ vapidKey }: { vapidKey: string | null }) {
  const [supported, setSupported] = useState(false);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(ok);
    if (ok) void navigator.serviceWorker.getRegistration().then((r) => r?.pushManager.getSubscription()).then((s) => setOn(Boolean(s)));
  }, []);

  const disabled = !vapidKey || !supported || busy;
  const description = !vapidKey
    ? "Noch nicht eingerichtet (Betreiber muss Push-Schlüssel hinterlegen)."
    : !supported
      ? "Dein Browser unterstützt keine Push-Benachrichtigungen (iPhone: App zuerst zum Home-Bildschirm hinzufügen)."
      : "„Deine Serie ist in Gefahr! 🔥“ – abends, wenn du noch nicht gelernt hast.";

  async function toggle() {
    if (!vapidKey) return;
    setBusy(true);
    setMsg(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      if (on) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await deletePushSubscriptionAction(sub.endpoint);
          await sub.unsubscribe();
        }
        setOn(false);
      } else {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          setMsg("Benachrichtigungen wurden im Browser nicht erlaubt.");
          return;
        }
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) });
        const res = await savePushSubscriptionAction(sub.toJSON());
        if (!res.ok) setMsg(res.error ?? "Speichern fehlgeschlagen.");
        else setOn(true);
      }
    } catch {
      setMsg("Push konnte nicht aktiviert werden.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("py-3", disabled && !busy && "opacity-60")}>
      <label className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-link">
          <BellRing className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-navy">Push-Erinnerungen</span>
          <span className="block text-xs text-muted-foreground">{description}</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Push-Erinnerungen"
          disabled={disabled}
          onClick={() => void toggle()}
          className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", on ? "bg-primary" : "bg-foreground/20")}
        >
          <motion.span className="absolute top-1 left-1 size-5 rounded-full bg-white shadow" animate={{ x: on ? 20 : 0 }} transition={spring} />
        </button>
      </label>
      {msg && <p className="mt-1 pl-12 text-xs text-destructive">{msg}</p>}
    </div>
  );
}
