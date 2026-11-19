"use client";

import { useActionState } from "react";
import { UserRound } from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";
import { guestLoginAction, type FormState } from "@/server/actions/auth";
import { FormError } from "./form-error";
import { useSceneForm } from "./use-scene-form";

/** „Als Gast testen" – eigenes anonymes Konto für dieses Gerät, ohne E-Mail. */
export function GuestButton() {
  const [state, action] = useActionState<FormState>(guestLoginAction, {});
  useSceneForm(state);
  return (
    <form action={action} className="space-y-2">
      <FormError message={state.error} />
      <SubmitButton variant="outline" size="lg" className="w-full border-white/15 bg-white/[0.04]" pendingText="Gastzugang wird vorbereitet…">
        <UserRound /> Als Gast testen
      </SubmitButton>
      <p className="text-center text-xs text-muted-foreground">Ohne E-Mail. Dein Fortschritt bleibt auf diesem Gerät – später jederzeit als Konto sichern.</p>
    </form>
  );
}
