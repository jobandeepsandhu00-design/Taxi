"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult } from "@/server/actions/types";

/** Führt eine Server-Action aus (optional mit explizitem router.refresh()) und verwaltet Lade-/Fehler-/Erfolgszustand. */
export function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function run<T>(fn: () => Promise<ActionResult<T>>, opts?: { onSuccess?: (data: T) => void; refresh?: boolean; confirm?: string }) {
    if (opts?.confirm && !window.confirm(opts.confirm)) return;
    setError(null);
    setMessage(null);
    start(async () => {
      try {
        const res = await fn();
        if (!res.ok) {
          setError(res.error);
          setFieldErrors(res.fieldErrors ?? {});
          return;
        }
        setFieldErrors({});
        setMessage(res.message ?? "Gespeichert.");
        opts?.onSuccess?.(res.data);
        // Die Admin-Actions rufen revalidatePath auf – die Seite wird dadurch automatisch aktualisiert.
        if (opts?.refresh) router.refresh();
      } catch {
        setError("Unerwarteter Fehler. Bitte erneut versuchen.");
      }
    });
  }

  return { run, pending, error, message, fieldErrors, setError, setMessage };
}
