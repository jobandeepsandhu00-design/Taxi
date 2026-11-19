import type { Metadata } from "next";
import Link from "next/link";
import { GuestButton } from "@/components/auth/guest-button";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Anmelden" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="pb-6">
      <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Servus! Bereit für die Fahrt?</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Melde dich an und mach dort weiter, wo du aufgehört hast.</p>
      <LoginForm next={next} />
      <div className="my-5 flex items-center gap-3 text-xs font-semibold text-muted-foreground uppercase">
        <span className="h-px flex-1 bg-white/10" /> oder <span className="h-px flex-1 bg-white/10" />
      </div>
      <GuestButton />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Noch kein Konto?{" "}
        <Link href="/registrieren" className="font-semibold text-primary hover:underline">
          Jetzt kostenlos registrieren
        </Link>
      </p>
    </div>
  );
}
