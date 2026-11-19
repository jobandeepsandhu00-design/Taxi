import Link from "next/link";
import { Info } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="mb-5 flex flex-col gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3.5 text-sm text-warning sm:flex-row sm:items-center sm:justify-between">
      <p className="flex gap-2">
        <Info className="mt-0.5 size-4 shrink-0" />
        <span>
          <strong>Demo-Modus:</strong> Du nutzt ein gemeinsames Demo-Konto. Fortschritt ist für alle Demo-Besucher sichtbar.
        </span>
      </p>
      <Link href="/registrieren" className="shrink-0 font-semibold text-foreground underline underline-offset-4">
        Eigenes Konto erstellen
      </Link>
    </div>
  );
}
