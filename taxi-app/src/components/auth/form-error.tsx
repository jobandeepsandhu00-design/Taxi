"use client";

import { AnimatePresence, motion } from "motion/react";
import { XCircle } from "lucide-react";

/** Fehlermeldung, die von oben hereingleitet (aria-live für Screenreader). */
export function FormError({ message }: { message?: string }) {
  return (
    <div aria-live="assertive">
      <AnimatePresence mode="wait">
        {message && (
          <motion.p
            key={message}
            role="alert"
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="flex items-start gap-2 overflow-hidden rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-sm text-red-200"
          >
            <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            {message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
