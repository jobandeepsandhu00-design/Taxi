"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { isIOS, isMobile, isStandalone } from "@/lib/platform";
import { installEvent, openInstallSheet } from "./pwa-events";

/** Kleiner „Installieren“-Chip in der oberen Leiste (nur mobiler Browser, nicht installiert). */
export function InstallChip() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const check = () => setShow(!isStandalone() && isMobile() && (isIOS() || Boolean(installEvent())));
    check();
    window.addEventListener("tp-install-ready", check);
    window.addEventListener("tp-installed", check);
    return () => {
      window.removeEventListener("tp-install-ready", check);
      window.removeEventListener("tp-installed", check);
    };
  }, []);
  if (!show) return null;
  return (
    <button type="button" onClick={() => openInstallSheet("manual")} data-testid="install-chip" aria-label="App installieren" className="flex size-9 items-center justify-center gap-1 rounded-full bg-[#ffc400] text-xs font-extrabold text-[#111] active:scale-95 min-[430px]:h-8 min-[430px]:w-auto min-[430px]:px-2.5">
      <Download className="size-4 min-[430px]:size-3.5" /> <span className="hidden min-[430px]:inline">Installieren</span>
    </button>
  );
}

/** Profil-Eintrag „App installieren“ (ausgeblendet, wenn bereits installiert). */
export function InstallEntry() {
  const [standalone, setStandalone] = useState(true);
  useEffect(() => setStandalone(isStandalone()), []);
  if (standalone) return null;
  return (
    <button type="button" onClick={() => openInstallSheet("manual")} data-testid="profil-install" className="flex w-full items-center gap-3 py-3 text-left">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#ffc400]/20 text-[#b88a00]">
        <Download className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-navy">App installieren</span>
        <span className="block text-xs text-muted-foreground">Vollbild, offline lernen und Erinnerungen</span>
      </span>
      <span className="text-muted-foreground">›</span>
    </button>
  );
}
