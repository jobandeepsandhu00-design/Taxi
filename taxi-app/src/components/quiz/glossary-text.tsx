"use client";

import { AnimatePresence, motion } from "motion/react";
import { Fragment, useEffect, useRef, useState } from "react";
import { haptic } from "@/lib/motion";

export type GlossaryTerm = { term: string; definition: string };

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Text mit gepunktet unterstrichenen Fachbegriffen; Tippen zeigt eine 1-Satz-Erklärung. */
export function GlossaryText({ text, terms }: { text: string; terms: GlossaryTerm[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const usable = terms.filter((t) => t.term && text.includes(t.term));
  if (usable.length === 0) return <>{text}</>;
  const re = new RegExp(`(${usable.map((t) => escapeRe(t.term)).sort((a, b) => b.length - a.length).join("|")})`, "g");
  const parts = text.split(re);
  const seen = new Set<string>();
  return (
    <span ref={ref}>
      {parts.map((part, i) => {
        const t = usable.find((x) => x.term === part);
        if (!t || seen.has(part)) return <Fragment key={i}>{part}</Fragment>;
        seen.add(part);
        const isOpen = open === part;
        return (
          <span key={i} className="relative inline">
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                haptic(6);
                setOpen(isOpen ? null : part);
              }}
              aria-expanded={isOpen}
              aria-haspopup="true"
              title="Erklärung anzeigen"
              className="cursor-help underline decoration-link decoration-dotted decoration-2 underline-offset-4"
            >
              {part}
            </button>
            <AnimatePresence>
              {isOpen && (
                <motion.span
                  role="tooltip"
                  className="absolute top-full left-0 z-30 mt-2 block w-64 max-w-[80vw] rounded-xl border border-border bg-card p-3 text-left text-sm font-normal leading-snug text-foreground shadow-xl"
                  initial={{ opacity: 0, y: -4, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 420, damping: 28 }}
                >
                  <span className="block text-xs font-bold text-link">{t.term}</span>
                  {t.definition}
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        );
      })}
    </span>
  );
}
