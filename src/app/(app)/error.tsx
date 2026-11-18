"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-red-100 text-destructive">
        <AlertTriangle className="size-7" />
      </div>
      <h1 className="text-xl font-extrabold text-navy">Etwas ist schiefgelaufen</h1>
      <p className="max-w-sm text-sm text-muted-foreground">Bitte versuche es erneut. Dein bisheriger Fortschritt ist gespeichert.</p>
      <Button onClick={reset}>Erneut versuchen</Button>
    </div>
  );
}
