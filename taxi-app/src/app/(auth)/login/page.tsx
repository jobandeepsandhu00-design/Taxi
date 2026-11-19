import type { Metadata } from "next";
import Link from "next/link";
import { DemoLoginButton } from "@/components/demo/demo-login-button";
import { isDemoLoginEnabled } from "@/lib/demo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Anmelden" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-navy">Willkommen zurück</h1>
      <p className="mt-2 text-muted-foreground">Melde dich an, um mit dem Lernen weiterzumachen.</p>
      <LoginForm next={next} />
      {isDemoLoginEnabled() && (
        <>
          <div className="my-6 flex items-center gap-3 text-xs font-semibold text-muted-foreground uppercase">
            <span className="h-px flex-1 bg-border" /> oder <span className="h-px flex-1 bg-border" />
          </div>
          <DemoLoginButton />
        </>
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Noch kein Konto?{" "}
        <Link href="/registrieren" className="font-semibold text-link hover:underline">
          Jetzt kostenlos registrieren
        </Link>
      </p>
    </div>
  );
}
