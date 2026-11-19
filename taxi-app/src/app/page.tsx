import Link from "next/link";
import { DemoLoginButton } from "@/components/demo/demo-login-button";
import { isDemoLoginEnabled } from "@/lib/demo";
import { redirect } from "next/navigation";
import { ArrowRight, BarChart3, ClipboardCheck, Layers, MapPinned, RotateCcw, Sparkles } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";

const features = [
  { icon: Sparkles, title: "Lernmodus", text: "Fragen nach Kategorie mit sofortigem Feedback und ausführlichen Erklärungen." },
  { icon: ClipboardCheck, title: "Prüfungssimulation", text: "Countdown, Fragennavigation, Markieren zur Überprüfung und Bestehensauswertung." },
  { icon: RotateCcw, title: "Fehlertraining", text: "Falsch beantwortete Fragen werden automatisch gesammelt und wiederholt." },
  { icon: Layers, title: "Lernkarten", text: "Karteikarten mit Flip-Animation – schwierige Karten gezielt wiederholen." },
  { icon: MapPinned, title: "Wiener Ortskenntnisse", text: "Bezirke, Sehenswürdigkeiten, Bahnhöfe, Spitäler und wichtige Routen." },
  { icon: BarChart3, title: "Fortschritt", text: "Trefferquote je Kategorie, Lernzeit, schwächste Themen und Prüfungsbereitschaft." },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const settings = await getSettings();
  return (
    <div className="min-h-dvh bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <div className="flex gap-2">
          <Button asChild variant="ghost">
            <Link href="/login">Anmelden</Link>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/registrieren">Registrieren</Link>
          </Button>
        </div>
      </header>
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 -top-40 -z-10 mx-auto h-[480px] max-w-4xl rounded-full bg-gradient-to-br from-blue-200/60 via-sky-100/50 to-transparent blur-3xl" />
        <div className="mx-auto max-w-4xl px-5 pt-12 pb-16 text-center sm:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-semibold text-primary shadow-sm">
            <span className="size-2 rounded-full bg-emerald-500" /> Vorbereitung auf die Taxi-Prüfung · Wien
          </span>
          <h1 className="mt-6 text-4xl leading-[1.1] font-extrabold tracking-tight text-navy sm:text-6xl">
            Bestehe deine <span className="bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent">Taxi-Prüfung</span> in Österreich
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Strukturiert lernen, realistisch üben und den eigenen Fortschritt verfolgen – von der StVO über das Gewerberecht bis zu den Wiener Ortskenntnissen.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/registrieren">
                Kostenlos starten <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Ich habe bereits ein Konto</Link>
            </Button>
          </div>
          {isDemoLoginEnabled() && (
            <div className="mx-auto mt-4 max-w-sm">
              <DemoLoginButton label="Demo ausprobieren – ohne Anmeldung" />
              <p className="mt-2 text-xs text-muted-foreground">Sofort loslegen mit einem Demo-Konto. Keine Daten nötig.</p>
            </div>
          )}
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-5 pb-16 sm:grid-cols-2 lg:grid-cols-3 grid-cols-1">
        {features.map((f) => (
          <div key={f.title} className="rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-blue-50 text-primary">
              <f.icon className="size-5" />
            </div>
            <h3 className="font-bold text-navy">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </section>
      <footer className="border-t bg-muted/50">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <p className="max-w-2xl leading-relaxed">{settings.disclaimer}</p>
          <div className="flex gap-4">
            <Link href="/impressum" className="hover:text-navy">Impressum</Link>
            <Link href="/datenschutz" className="hover:text-navy">Datenschutz</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
