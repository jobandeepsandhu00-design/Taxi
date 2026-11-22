"use client";

import { motion } from "motion/react";
import { BellRing, Laptop, Loader2, Moon, Send, Smartphone, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { DeniedHelp } from "@/components/pwa/push-ask";
import { openInstallSheet } from "@/components/pwa/pwa-events";
import { isIOS, isStandalone, pushSupported } from "@/lib/platform";
import { currentSubscription, disablePush, enablePush, permission, type PermissionState } from "@/lib/push/client";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { removeDeviceAction, saveNotificationPrefsAction, sendTestPushAction } from "@/server/actions/push";

type Prefs = {
  enabled: boolean;
  dailyReminder: boolean;
  reminderTime: string;
  streakAlerts: boolean;
  dueAlerts: boolean;
  challengeAlerts: boolean;
  duelAlerts: boolean;
  examCountdown: boolean;
  weeklyReport: boolean;
  quietStart: string;
  quietEnd: string;
  timezone: string;
};
type Device = { id: string; endpoint: string; platform: string | null; userAgent: string | null; createdAt: string; lastSuccessAt: string | null };

function Toggle({ checked, onChange, label, disabled, testId }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean; testId?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      data-testid={testId}
      onClick={() => onChange(!checked)}
      className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50", checked ? "bg-primary" : "bg-foreground/20")}
    >
      <motion.span className="absolute top-1 left-1 size-5 rounded-full bg-white shadow" animate={{ x: checked ? 20 : 0 }} transition={spring} />
    </button>
  );
}

const TYPES: { key: keyof Prefs; label: string; hint: string }[] = [
  { key: "dueAlerts", label: "Fällige Fragen", hint: "🔁 Wenn Wiederholungen anstehen" },
  { key: "streakAlerts", label: "Serie in Gefahr", hint: "🔥 Abends um 19:30, wenn du noch nicht gelernt hast" },
  { key: "challengeAlerts", label: "Daily Challenge", hint: "⚡ Morgens um 08:30" },
  { key: "examCountdown", label: "Prüfungs-Countdown", hint: "📅 30, 14, 7, 3 und 1 Tag vor dem Termin" },
  { key: "weeklyReport", label: "Wochenbericht", hint: "📊 Sonntags um 18:00" },
  { key: "duelAlerts", label: "Duelle", hint: "⚔️ Sofort, wenn jemand deinem Duell beitritt" },
];

function deviceName(d: Device): string {
  const ua = d.userAgent ?? "";
  if (d.platform === "ios") return /ipad/i.test(ua) ? "iPad" : "iPhone";
  if (d.platform === "android") return "Android";
  if (/edg\//i.test(ua)) return "Edge (Computer)";
  if (/firefox/i.test(ua)) return "Firefox (Computer)";
  if (/chrome/i.test(ua)) return "Chrome (Computer)";
  if (/safari/i.test(ua)) return "Safari (Mac)";
  return "Browser";
}

export function NotificationSettings({ vapidKey, initial, devices }: { vapidKey: string | null; initial: Prefs; devices: Device[] }) {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Prefs>(initial);
  const [perm, setPerm] = useState<PermissionState>("default");
  const [thisEndpoint, setThisEndpoint] = useState<string | null>(null);
  const [needsInstall, setNeedsInstall] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, startSave] = useTransition();

  useEffect(() => {
    setPerm(permission());
    setNeedsInstall(isIOS() && !isStandalone());
    void currentSubscription().then((s) => setThisEndpoint(s?.endpoint ?? null));
    if (!initial.timezone || initial.timezone === "Europe/Vienna") {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz && tz !== initial.timezone) setPrefs((p) => ({ ...p, timezone: tz }));
    }
  }, [initial.timezone]);

  const update = (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    startSave(async () => {
      const r = await saveNotificationPrefsAction(next);
      if (!r.ok) setMsg({ ok: false, text: r.error ?? "Speichern fehlgeschlagen." });
    });
  };

  const thisDeviceOn = Boolean(thisEndpoint && devices.some((d) => d.endpoint === thisEndpoint));

  async function enableHere() {
    if (!vapidKey) return;
    setBusy(true);
    setMsg(null);
    const r = await enablePush(vapidKey);
    setPerm(r.state);
    setBusy(false);
    if (r.ok) {
      setThisEndpoint((await currentSubscription())?.endpoint ?? null);
      if (!prefs.enabled) update({ enabled: true });
      router.refresh();
    } else if (r.error) setMsg({ ok: false, text: r.error });
  }

  const status = !vapidKey
    ? "Push ist auf dem Server noch nicht eingerichtet."
    : needsInstall
      ? "Auf dem iPhone funktionieren Benachrichtigungen nur in der installierten App."
      : perm === "unsupported" || !pushSupported()
        ? "Dieser Browser unterstützt keine Push-Benachrichtigungen."
        : perm === "denied"
          ? "Im Browser/System blockiert."
          : thisDeviceOn
            ? "Auf diesem Gerät aktiv ✓"
            : "Auf diesem Gerät noch nicht aktiviert.";

  return (
    <div className="space-y-4">
      <section className="glass rounded-2xl p-4" data-testid="notif-master">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#ffc400]/20 text-[#b88a00]">
            <BellRing className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-navy">Benachrichtigungen</p>
            <p className="text-xs text-muted-foreground" data-testid="notif-status">
              {status}
            </p>
          </div>
          <Toggle checked={prefs.enabled} onChange={(v) => update({ enabled: v })} label="Alle Benachrichtigungen" testId="notif-enabled" />
        </div>
        {vapidKey && needsInstall && (
          <button type="button" onClick={() => openInstallSheet("push")} className="mt-3 min-h-11 w-full rounded-xl bg-[#ffc400] text-sm font-extrabold text-[#111]">
            App installieren
          </button>
        )}
        {vapidKey && !needsInstall && pushSupported() && perm !== "denied" && !thisDeviceOn && (
          <button type="button" onClick={() => void enableHere()} disabled={busy} data-testid="notif-enable-here" className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#ffc400] text-sm font-extrabold text-[#111] disabled:opacity-70">
            {busy && <Loader2 className="size-4 animate-spin" />} Auf diesem Gerät aktivieren
          </button>
        )}
        {perm === "denied" && (
          <div className="mt-3">
            <DeniedHelp />
          </div>
        )}
      </section>

      <section className={cn("glass divide-y divide-border rounded-2xl px-4", !prefs.enabled && "opacity-60")}>
        <div className="py-3">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-navy">Tägliche Erinnerung</p>
              <p className="text-xs text-muted-foreground">🚕 Nur wenn du an dem Tag noch nicht gelernt hast</p>
            </div>
            <Toggle checked={prefs.dailyReminder} disabled={!prefs.enabled} onChange={(v) => update({ dailyReminder: v })} label="Tägliche Erinnerung" />
          </div>
          <label className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            Uhrzeit
            <input
              type="time"
              aria-label="Uhrzeit der Erinnerung"
              value={prefs.reminderTime}
              step={900}
              disabled={!prefs.enabled || !prefs.dailyReminder}
              onChange={(e) => e.target.value && update({ reminderTime: e.target.value.slice(0, 5) })}
              className="h-10 rounded-xl border border-input bg-muted px-2 text-sm text-foreground disabled:opacity-50"
              data-testid="notif-time"
            />
          </label>
        </div>
        {TYPES.map((t) => (
          <div key={t.key} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-navy">{t.label}</p>
              <p className="text-xs text-muted-foreground">{t.hint}</p>
            </div>
            <Toggle checked={Boolean(prefs[t.key])} disabled={!prefs.enabled} onChange={(v) => update({ [t.key]: v } as Partial<Prefs>)} label={t.label} testId={`notif-${t.key}`} />
          </div>
        ))}
        <div className="py-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-navy">
            <Moon className="size-4 text-muted-foreground" /> Ruhezeiten
          </p>
          <span className="mt-2 flex items-center justify-end gap-1.5 text-sm">
            <input type="time" aria-label="Ruhezeit von" value={prefs.quietStart} onChange={(e) => e.target.value && update({ quietStart: e.target.value.slice(0, 5) })} className="h-10 rounded-xl border border-input bg-muted px-2 text-sm text-foreground" />
            –
            <input type="time" aria-label="Ruhezeit bis" value={prefs.quietEnd} onChange={(e) => e.target.value && update({ quietEnd: e.target.value.slice(0, 5) })} className="h-10 rounded-xl border border-input bg-muted px-2 text-sm text-foreground" />
          </span>
        </div>
        <p className="py-3 text-xs text-muted-foreground">Höchstens 2 Benachrichtigungen pro Tag (Duelle ausgenommen). Zeitzone: {prefs.timezone}</p>
      </section>

      <section className="glass rounded-2xl p-4">
        <button
          type="button"
          data-testid="notif-test"
          disabled={!vapidKey || busy}
          onClick={async () => {
            setBusy(true);
            setMsg(null);
            const r = await sendTestPushAction();
            setBusy(false);
            setMsg(r.ok ? { ok: true, text: "Gesendet – sie sollte gleich erscheinen." } : { ok: false, text: r.error ?? "Fehler" });
          }}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-bold text-link disabled:opacity-50"
        >
          <Send className="size-4" /> Test-Benachrichtigung senden
        </button>
        {msg && (
          <p className={cn("mt-2 text-xs font-semibold", msg.ok ? "text-success" : "text-destructive")} role="status">
            {msg.text}
          </p>
        )}
        {saving && <p className="mt-2 text-xs text-muted-foreground">Speichern …</p>}
      </section>

      <section className="glass rounded-2xl p-4" data-testid="notif-devices">
        <p className="text-sm font-bold text-navy">Aktive Geräte</p>
        {devices.length === 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">Noch kein Gerät angemeldet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {devices.map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-2.5">
                {d.platform === "desktop" ? <Laptop className="size-5 text-muted-foreground" /> : <Smartphone className="size-5 text-muted-foreground" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-navy">
                    {deviceName(d)} {d.endpoint === thisEndpoint && <span className="text-xs font-bold text-success">· dieses Gerät</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">seit {new Date(d.createdAt).toLocaleDateString("de-AT")}</p>
                </div>
                <button
                  type="button"
                  aria-label={`${deviceName(d)} entfernen`}
                  onClick={async () => {
                    if (d.endpoint === thisEndpoint) {
                      await disablePush();
                      setThisEndpoint(null);
                    }
                    await removeDeviceAction(d.id);
                    router.refresh();
                  }}
                  className="flex min-h-10 items-center gap-1 rounded-xl px-2 text-xs font-bold text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-4" /> Entfernen
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
