import type { Metadata } from "next";
import Link from "next/link";
import { DemoLoginButton } from "@/components/demo/demo-login-button";
import { isDemoLoginEnabled } from "@/lib/demo";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Registrieren" };

export default function RegisterPage() {
  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-navy">Konto erstellen</h1>
      <p className="mt-2 text-muted-foreground">Starte deine Vorbereitung auf die Taxi-Prüfung in Wien.</p>
      <RegisterForm />
      {isDemoLoginEnabled() && (
        <>
          <div className="my-6 flex items-center gap-3 text-xs font-semibold text-muted-foreground uppercase">
            <span className="h-px flex-1 bg-border" /> oder <span className="h-px flex-1 bg-border" />
          </div>
          <DemoLoginButton />
        </>
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Bereits registriert?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Anmelden
        </Link>
      </p>
    </div>
  );
}
