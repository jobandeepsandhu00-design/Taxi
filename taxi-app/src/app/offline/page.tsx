import { WifiOff } from "lucide-react";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/15 text-link">
        <WifiOff className="size-8" />
      </div>
      <h1 className="text-2xl font-extrabold text-navy">Keine Internetverbindung</h1>
      <p className="max-w-sm text-muted-foreground">
        Dein Lernfortschritt wird in der Datenbank gespeichert. Sobald du wieder online bist, kannst du direkt weiterlernen.
      </p>
      <a href="/dashboard" className="font-semibold text-link hover:underline">
        Erneut versuchen
      </a>
    </div>
  );
}
