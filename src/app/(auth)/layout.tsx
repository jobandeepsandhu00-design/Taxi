import { Logo } from "@/components/logo";
import { CheckCircle2 } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-5 py-8 sm:px-10">
        <Logo />
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-navy lg:block">
        <div className="absolute -top-40 -right-40 size-[520px] rounded-full bg-blue-600/40 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 size-[420px] rounded-full bg-sky-400/20 blur-3xl" />
        <div className="relative flex h-full flex-col justify-center gap-8 p-14 text-white">
          <h2 className="text-4xl leading-tight font-extrabold">
            Sicher zur Taxi-Prüfung.
            <br />
            <span className="text-blue-300">Strukturiert lernen.</span>
          </h2>
          <ul className="space-y-3 text-blue-100">
            {[
              "10 Lernkategorien von StVO bis Wiener Ortskenntnisse",
              "Realistische Prüfungssimulation mit Countdown",
              "Automatisches Fehlertraining & Lernkarten",
              "Fortschritt und Prüfungsbereitschaft im Blick",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <CheckCircle2 className="size-5 text-emerald-300" />
                {t}
              </li>
            ))}
          </ul>
          <p className="max-w-md text-xs text-blue-200/80">
            Unabhängiges Lernangebot. Übungsfragen sind eigenständig erstellt und keine offiziellen Prüfungsfragen.
          </p>
        </div>
      </div>
    </div>
  );
}
