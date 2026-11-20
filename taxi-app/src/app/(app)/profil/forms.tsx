"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { FieldError, Input, Label, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { changePasswordAction, updateProfileAction, type FormState } from "@/server/actions/auth";

export function ProfileForm({
  name,
  targetExamDate,
  examType,
  dailyGoalMinutes,
  isGuest,
}: {
  name: string;
  targetExamDate: string;
  examType: string;
  dailyGoalMinutes: number | null;
  isGuest: boolean;
}) {
  const [state, action] = useActionState<FormState, FormData>(updateProfileAction, {});
  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert variant="error">{state.error}</Alert>}
      {state.success && <Alert variant="success">{state.success}</Alert>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={name} required disabled={isGuest} />
          {isGuest && <p className="text-xs text-muted-foreground">Im Gastmodus nicht änderbar.</p>}
          <FieldError messages={state.fieldErrors?.name} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="targetExamDate">Geplanter Prüfungstermin</Label>
          <Input id="targetExamDate" name="targetExamDate" type="date" defaultValue={targetExamDate} />
          <FieldError messages={state.fieldErrors?.targetExamDate} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="examType">Prüfung</Label>
          <Select id="examType" name="examType" defaultValue={examType}>
            <option value="">Noch nicht festgelegt</option>
            <option value="TAXILENKER">Taxilenker:in</option>
            <option value="KONZESSION">Konzession</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dailyGoalMinutes">Tagesziel</Label>
          <Select id="dailyGoalMinutes" name="dailyGoalMinutes" defaultValue={dailyGoalMinutes ? String(dailyGoalMinutes) : "20"}>
            <option value="10">10 Minuten · locker</option>
            <option value="20">20 Minuten · regelmäßig</option>
            <option value="30">30 Minuten · intensiv</option>
          </Select>
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
