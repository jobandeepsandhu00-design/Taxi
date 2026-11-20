"use client";

import { useEffect } from "react";

/** Leichte Welle in Theme-Farbe an jedem Tippunkt (respektiert „Bewegung reduzieren“). */
export function TapRipple() {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    function onDown(e: PointerEvent) {
      if (mq.matches || document.documentElement.classList.contains("reduce-motion") || !e.isPrimary) return;
      const el = document.createElement("span");
      el.className = "tap-ripple";
      el.style.left = `${e.clientX}px`;
      el.style.top = `${e.clientY}px`;
      document.body.appendChild(el);
      const big = document.documentElement.dataset.theme === "donau";
      const anim = el.animate([{ transform: "scale(0.4)", opacity: 0.9 }, { transform: `scale(${big ? 7 : 4.5})`, opacity: 0 }], { duration: big ? 650 : 450, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" });
      anim.onfinish = () => el.remove();
    }
    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);
  return null;
}
