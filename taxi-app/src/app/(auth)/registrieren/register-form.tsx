"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { FieldError, Input, Label } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { registerAction, type FormState } from "@/server/actions/auth";

export function RegisterForm() {
  const [state, action] = useActionState<FormState, FormData>(registerAction, {});
  return (
    <form action={action} className="mt-8 space-y-4" noValidate>
      {state.error && <Alert variant="error">{state.error}</Alert>}
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" autoComplete="name" required />
        <FieldError messages={state.fieldErrors?.name} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">E-Mail-Adresse</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        <FieldError messages={state.fieldErrors?.email} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Passwort</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
        <p className="text-xs text-muted-foreground">Mindestens 10 Zeichen, Buchstaben und Ziffern.</p>
        <FieldError messages={state.fieldErrors?.password} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="passwordConfirm">Passwort wiederholen</Label>
        <Input id="passwordConfirm" name="passwordConfirm" type="password" autoComplete="new-password" required />
        <FieldError messages={state.fieldErrors?.passwordConfirm} />
      </div>
      <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
        <input type="checkbox" name="terms" className="mt-0.5 size-4 accent-blue-700" />
        <span>
          Ich habe verstanden, dass Übungs- und Demo-Fragen keine offiziellen Prüfungsfragen sind, und akzeptiere die{" "}
          <Link href="/datenschutz" className="font-semibold text-link hover:underline">
            Datenschutzerklärung
          </Link>
          .
        </span>
      </label>
      <FieldError messages={state.fieldErrors?.terms} />
      <SubmitButton className="w-full" size="lg" pendingText="Konto wird erstellt…">
        Registrieren
      </SubmitButton>
    </form>
  );
}
