import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { logoutAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { PasswordForm, ProfileForm } from "./forms";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilePage() {
  const user = await requireUser();
  const full = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { createdAt: true, email: true } });
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Mein Profil" description={`Mitglied seit ${formatDate(full.createdAt)} · ${full.email}`} />
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Persönliche Daten & Prüfungstermin</CardTitle></CardHeader>
          <CardContent>
            <ProfileForm name={user.name} targetExamDate={user.targetExamDate ? user.targetExamDate.toISOString().slice(0, 10) : ""} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Passwort ändern</CardTitle></CardHeader>
          <CardContent><PasswordForm /></CardContent>
        </Card>
        <form action={logoutAction}>
          <Button type="submit" variant="outline">Abmelden</Button>
        </form>
      </div>
    </div>
  );
}
