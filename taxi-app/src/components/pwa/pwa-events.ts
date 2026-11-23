/** Kleine Ereignis-Brücke für PWA-Dialoge (Installieren, Push-Nachfrage). */
export type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

declare global {
  interface Window {
    __tpInstall?: InstallEvent | null;
    /** „Aktualisieren“ getippt → nach dem SW-Wechsel neu laden */
    __tpWantsUpdate?: boolean;
  }
}

export function openInstallSheet(reason: "manual" | "push" = "manual") {
  window.dispatchEvent(new CustomEvent("tp-open-install", { detail: { reason } }));
}
export function openPushAsk() {
  window.dispatchEvent(new CustomEvent("tp-open-push"));
}
export function installEvent(): InstallEvent | null {
  return typeof window === "undefined" ? null : (window.__tpInstall ?? null);
}
