/** Plattform-Erkennung (nur im Browser aufrufen). Später für Capacitor um "native" erweiterbar. */
export type Platform = "ios" | "android" | "desktop";

type Nav = Navigator & { standalone?: boolean; userAgentData?: { mobile?: boolean } };

function ua(): string {
  return typeof navigator === "undefined" ? "" : navigator.userAgent;
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  // iPadOS meldet sich als Mac – Touch verrät es
  return /iphone|ipad|ipod/i.test(ua()) || (/macintosh/i.test(ua()) && navigator.maxTouchPoints > 1);
}
export function isAndroid(): boolean {
  return /android/i.test(ua());
}
/** iOS, aber nicht Safari (Chrome/Firefox/Edge auf iOS können nicht installieren) */
export function isIOSNonSafari(): boolean {
  return isIOS() && /crios|fxios|edgios|opios|gsa\//i.test(ua());
}
/** In-App-Browser (Instagram, Facebook, TikTok, …) – dort geht weder Installation noch Push */
export function isInAppBrowser(): boolean {
  return /instagram|fban|fbav|fb_iab|tiktok|bytedancewebview|musical_ly|line\/|snapchat|twitter|linkedinapp|pinterest|wv\)/i.test(ua());
}
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || window.matchMedia?.("(display-mode: minimal-ui)").matches || Boolean((navigator as Nav).standalone);
}
export function platform(): Platform {
  return isIOS() ? "ios" : isAndroid() ? "android" : "desktop";
}
export function isMobile(): boolean {
  return isIOS() || isAndroid() || Boolean((navigator as Nav).userAgentData?.mobile);
}
export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}
/** iPhone: Push nur in der installierten App (iOS 16.4+) */
export function pushNeedsInstall(): boolean {
  return isIOS() && !isStandalone();
}

/** Kleiner, fehlertoleranter localStorage-Zugriff */
export const store = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* privat/blockiert */
    }
  },
};
