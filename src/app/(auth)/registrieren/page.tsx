import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Registrieren" };

export default function RegisterPage() {
  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-navy">Konto erstellen</h1>
      <p className="mt-2 text-muted-foreground">Starte deine Vorbereitung auf die Taxi-Prüfung in Wien.</p>
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Bereits registriert?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Anmelden
        </Link>
      </p>
    </div>
  );
}
