"use client";

import { useActionState } from "react";
import { FormError } from "@/components/auth/form-error";
import { useSceneForm } from "@/components/auth/use-scene-form";
import { FieldError } from "@/components/ui/input";
import { FloatingInput } from "@/components/ui/floating-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { loginAction, type FormState } from "@/server/actions/auth";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(loginAction, {});
  useSceneForm(state);
  return (
    <form action={action} className="mt-6 space-y-3" noValidate>
      <FormError message={state.error} />
      <input type="hidden" name="next" value={next ?? ""} />
      <FloatingInput id="email" name="email" type="email" label="E-Mail-Adresse" autoComplete="email" required aria-invalid={Boolean(state.fieldErrors?.email)} />
      <FieldError messages={state.fieldErrors?.email} />
      <FloatingInput id="password" name="password" type="password" label="Passwort" autoComplete="current-password" required aria-invalid={Boolean(state.fieldErrors?.password)} />
      <FieldError messages={state.fieldErrors?.password} />
      <SubmitButton className="mt-2 w-full" size="lg" pendingText="Anmeldung läuft…">
        Anmelden
      </SubmitButton>
    </form>
  );
}
