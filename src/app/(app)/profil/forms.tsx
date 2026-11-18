"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { FieldError, Input, Label } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { changePasswordAction, updateProfileAction, type FormState } from "@/server/actions/auth";

export function ProfileForm({ name, targetExamDate }: { name: string; targetExamDate: string }) {
  const [state, action] = useActionState<FormState, FormData>(updateProfileAction, {});
  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert variant="error">{state.error}</Alert>}
      {state.success && <Alert variant="success">{state.success}</Alert>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={name} required />
          <FieldError messages={state.fieldErrors?.name} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="targetExamDate">Geplanter Prüfungstermin</Label>
          <Input id="targetExamDate" name="targetExamDate" type="date" defaultValue={targetExamDate} />
          <FieldError messages={state.fieldErrors?.targetExamDate} />
        </div>
      </div>
      <SubmitButton>Speichern</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(changePasswordAction, {});
  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert variant="error">{state.error}</Alert>}
      {state.success && <Alert variant="success">{state.success}</Alert>}
      <div className="space-y-1.5">
        <Label htmlFor="currentPassword">Aktuelles Passwort</Label>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="newPassword">Neues Passwort</Label>
          <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required />
          <FieldError messages={state.fieldErrors?.newPassword} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="newPasswordConfirm">Neues Passwort wiederholen</Label>
          <Input id="newPasswordConfirm" name="newPasswordConfirm" type="password" autoComplete="new-password" required />
          <FieldError messages={state.fieldErrors?.newPasswordConfirm} />
        </div>
      </div>
      <SubmitButton>Passwort ändern</SubmitButton>
    </form>
  );
}
