import { Loader2 } from "lucide-react";

/** Vollbild-Routen (Quiz, Prüfung, Auto-Modus): kurzer Ladezustand statt leerem Bildschirm. */
export default function Loading() {
  return (
    <div className="tp-skeleton flex min-h-dvh flex-col items-center justify-center gap-3" role="status" aria-label="Wird geladen">
      <Loader2 className="size-8 animate-spin text-primary" />
      <span className="text-sm font-semibold text-muted-foreground">Wird vorbereitet …</span>
    </div>
  );
}
