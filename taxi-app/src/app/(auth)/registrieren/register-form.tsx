"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormError } from "@/components/auth/form-error";
import { useSceneForm } from "@/components/auth/use-scene-form";
import { FieldError } from "@/components/ui/input";
import { FloatingInput } from "@/components/ui/floating-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { registerAction, type FormState } from "@/server/actions/auth";

export function RegisterForm({ submitLabel = "Registrieren" }: { submitLabel?: string }) {
  const [state, action] = useActionState<FormState, FormData>(registerAction, {});
  useSceneForm(state);
  const fe = state.fieldErrors;
  return (
    <form action={action} className="mt-6 space-y-3" noValidate>
      <FormError message={state.error} />
      <FloatingInput id="name" name="name" label="Name" autoComplete="name" required aria-invalid={Boolean(fe?.name)} />
      <FieldError messages={fe?.name} />
      <FloatingInput id="email" name="email" type="email" label="E-Mail-Adresse" autoComplete="email" required aria-invalid={Boolean(fe?.email)} />
      <FieldError messages={fe?.email} />
      <FloatingInput id="password" name="password" type="password" label="Passwort" autoComplete="new-password" required minLength={10} aria-invalid={Boolean(fe?.password)} />
      <p className="-mt-1 px-1 text-xs text-muted-foreground">Mindestens 10 Zeichen, Buchstaben und Ziffern.</p>
      <FieldError messages={fe?.password} />
      <FloatingInput id="passwordConfirm" name="passwordConfirm" type="password" label="Passwort wiederholen" autoComplete="new-password" required aria-invalid={Boolean(fe?.passwordConfirm)} />
      <FieldError messages={fe?.passwordConfirm} />
      <label className="flex items-start gap-2.5 pt-1 text-sm text-muted-foreground">
        <input type="checkbox" name="terms" className="mt-0.5 size-4 shrink-0" />
        <span>
          Ich habe verstanden, dass Übungs- und Demo-Fragen keine offiziellen Prüfungsfragen sind, und akzeptiere die{" "}
          <Link href="/datenschutz" className="font-semibold text-primary hover:underline">
            Datenschutzerklärung
          </Link>
          .
        </span>
      </label>
      <FieldError messages={fe?.terms} />
      <SubmitButton className="mt-2 w-full" size="lg" pendingText="Konto wird erstellt…">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
