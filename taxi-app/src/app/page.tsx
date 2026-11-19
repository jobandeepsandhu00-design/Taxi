import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BarChart3, ClipboardCheck, Layers, MapPinned, RotateCcw, Sparkles } from "lucide-react";
import { AuthScene } from "@/components/auth/auth-scene";
import { GuestButton } from "@/components/auth/guest-button";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";

const features = [
  { icon: Sparkles, title: "Lernmodus" },
  { icon: ClipboardCheck, title: "Prüfungssimulation" },
  { icon: RotateCcw, title: "Fehlertraining" },
  { icon: Layers, title: "Lernkarten" },
  { icon: MapPinned, title: "Wiener Ortskunde" },
  { icon: BarChart3, title: "Fortschritt" },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const settings = await getSettings();
  return (
    <AuthScene
      aside={
        <div className="max-w-md">
          <h2 className="text-5xl leading-[1.05] font-bold tracking-tight text-white [text-shadow:0_4px_30px_rgba(0,0,0,0.6)]">
            Bestehe deine <span className="text-primary">Taxi-Prüfung</span> in Wien.
          </h2>
          <p className="mt-4 text-lg text-white/75 [text-shadow:0_2px_16px_rgba(0,0,0,0.7)]">Strukturiert lernen, realistisch üben – von der StVO bis zur Ortskunde.</p>
        </div>
      }
    >
      <div className="pb-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <span className="size-2 animate-pulse rounded-full bg-primary" /> Vorbereitung auf die Taxi-Prüfung · Wien
        </span>
        <h1 className="mt-4 text-3xl leading-tight font-bold tracking-tight text-white lg:hidden">
          Bestehe deine <span className="text-primary">Taxi-Prüfung</span> in Österreich
        </h1>
        <h1 className="mt-4 hidden text-2xl font-bold tracking-tight text-white lg:block">Los geht&apos;s – in wenigen Sekunden startklar</h1>
        <p className="mt-2 text-sm text-muted-foreground">Lernmodus, Prüfungssimulation, Fehlertraining und Lernkarten – alles in einer App.</p>
        <div className="mt-6 grid gap-3">
          <Button asChild size="lg">
            <Link href="/registrieren">
              Kostenlos starten <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-white/15 bg-white/[0.04]">
            <Link href="/login">Ich habe bereits ein Konto</Link>
          </Button>
        </div>
        <div className="my-5 flex items-center gap-3 text-xs font-semibold text-muted-foreground uppercase">
          <span className="h-px flex-1 bg-white/10" /> oder <span className="h-px flex-1 bg-white/10" />
        </div>
        <GuestButton />
        <ul className="mt-6 grid grid-cols-3 gap-2">
          {features.map((f) => (
            <li key={f.title} className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.03] px-2 py-3 text-center">
              <f.icon className="size-5 text-primary" />
              <span className="text-[11px] leading-tight font-semibold text-white/80">{f.title}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground">{settings.disclaimer}</p>
        <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
          <Link href="/impressum" className="hover:text-white">Impressum</Link>
          <Link href="/datenschutz" className="hover:text-white">Datenschutz</Link>
        </div>
      </div>
    </AuthScene>
  );
}
