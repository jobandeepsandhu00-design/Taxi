import type { Metadata } from "next";
import Link from "next/link";
import { GuestButton } from "@/components/auth/guest-button";
import { getCurrentUser } from "@/lib/auth/session";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Registrieren" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  const isGuest = Boolean(user?.isGuest);
  return (
    <div className="pb-6">
      <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{isGuest ? "Fortschritt sichern" : "Konto erstellen"}</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {isGuest
          ? "Dein bisheriger Lernfortschritt aus dem Gastmodus wird übernommen."
          : "Starte deine Vorbereitung auf die Taxi-Prüfung in Wien – kostenlos."}
      </p>
      <RegisterForm submitLabel={isGuest ? "Konto erstellen & sichern" : "Registrieren"} />
      {isGuest ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/dashboard" className="font-semibold text-primary hover:underline">
            Zurück zur App
          </Link>
        </p>
      ) : (
        <>
          <div className="my-5 flex items-center gap-3 text-xs font-semibold text-muted-foreground uppercase">
            <span className="h-px flex-1 bg-white/10" /> oder <span className="h-px flex-1 bg-white/10" />
          </div>
          <GuestButton />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Bereits registriert?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Anmelden
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
