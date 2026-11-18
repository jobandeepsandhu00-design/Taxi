"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { FieldError, Input, Label } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { loginAction, type FormState } from "@/server/actions/auth";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(loginAction, {});
  return (
    <form action={action} className="mt-8 space-y-4" noValidate>
      {state.error && <Alert variant="error">{state.error}</Alert>}
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="space-y-1.5">
        <Label htmlFor="email">E-Mail-Adresse</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="name@beispiel.at" />
        <FieldError messages={state.fieldErrors?.email} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Passwort</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
        <FieldError messages={state.fieldErrors?.password} />
      </div>
      <SubmitButton className="w-full" size="lg" pendingText="Anmeldung läuft…">
        Anmelden
      </SubmitButton>
    </form>
  );
}
