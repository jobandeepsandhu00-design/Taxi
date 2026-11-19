"use client";

import { useActionState } from "react";
import { PlayCircle } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { demoLoginAction, type FormState } from "@/server/actions/auth";

export function DemoLoginButton({ className, label = "Demo ausprobieren – ohne Anmeldung" }: { className?: string; label?: string }) {
  const [state, action] = useActionState<FormState>(demoLoginAction, {});
  return (
    <form action={action} className={className}>
      {state.error && <Alert variant="error" className="mb-3">{state.error}</Alert>}
      <SubmitButton variant="outline" size="lg" className="w-full" pendingText="Demo wird geladen…">
        <PlayCircle /> {label}
      </SubmitButton>
    </form>
  );
}
