"use client";

import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

/** Einfaches Bottom-Sheet (Mobil) bzw. zentrierter Dialog (Desktop). */
export function Sheet({ open, onClose, label, children, testId }: { open: boolean; onClose: () => void; label: string; children: React.ReactNode; testId?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={label} data-testid={testId}>
          <motion.button type="button" aria-label="Schließen" className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            ref={ref}
            tabIndex={-1}
            className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-white p-5 pb-[max(20px,env(safe-area-inset-bottom))] text-[#111] shadow-2xl outline-none sm:rounded-[28px] dark:bg-[#161616] dark:text-white"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
          >
            <span aria-hidden className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-black/10 sm:hidden dark:bg-white/15" />
            <button type="button" onClick={onClose} aria-label="Schließen" className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full text-[#8a8f98] hover:bg-black/5 dark:hover:bg-white/10">
              <X className="size-5" />
            </button>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
