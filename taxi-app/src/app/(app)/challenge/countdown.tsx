"use client";

import { useEffect, useState } from "react";

function msToViennaMidnight(): number {
  const now = new Date();
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Vienna", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const secs = Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second);
  return (86400 - secs) * 1000;
}

/** Countdown bis zur nächsten Challenge (Mitternacht in Wien). */
export function NextChallengeCountdown() {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    setMs(msToViennaMidnight());
    const id = window.setInterval(() => setMs(msToViennaMidnight()), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (ms === null) return <span className="tabular-nums">--:--:--</span>;
  const s = Math.floor(ms / 1000);
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return <span className="font-display tabular-nums">{hh}:{mm}:{ss}</span>;
}
