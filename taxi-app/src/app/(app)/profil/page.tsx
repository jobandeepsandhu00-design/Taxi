import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { avatarEmoji } from "@/lib/avatars";
import { levelFor } from "@/lib/gamification";
import { formatDate } from "@/lib/utils";
import { logoutAction } from "@/server/actions/auth";
import { PasswordForm, ProfileForm } from "./forms";
import { AvatarPicker, DeviceSettings } from "./settings";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilePage() {
  const user = await requireUser();
  const full = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { createdAt: true, email: true, xp: true } });
  const lvl = levelFor(full.xp);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Mein Profil" description={user.isGuest ? "Gastmodus – dein Fortschritt ist nur auf diesem Gerät gespeichert." : `Mitglied seit ${formatDate(full.createdAt)} · ${full.email}`} />
      <Stagger className="space-y-6">
        <StaggerItem>
          <Card className="panel-night flex items-center gap-4 p-5">
            <span className="flex size-16 items-center justify-center rounded-full bg-primary/15 text-4xl ring-2 ring-primary">{avatarEmoji(user.avatar) ?? "🚕"}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-xl font-bold text-white">{user.isGuest ? "Gast" : user.name}</p>
              <p className="text-sm text-white/70">
                Level {lvl.index + 1} · {lvl.name} · {full.xp.toLocaleString("de-AT")} XP
              </p>
            </div>
            {user.isGuest && (
              <Button asChild size="sm">
                <Link href="/registrieren">Konto erstellen</Link>
              </Button>
            )}
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card>
            <CardHeader>
              <CardTitle>Avatar</CardTitle>
              <CardDescription>Wähle dein Taxi-Profilbild.</CardDescription>
            </CardHeader>
            <CardContent>
              <AvatarPicker initial={user.avatar} />
            </CardContent>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card>
            <CardHeader>
              <CardTitle>Persönliche Daten & Lernziel</CardTitle>
              <CardDescription>Prüfungstermin und Tagesziel bestimmen Countdown, Tagesringe und deinen Lernplan.</CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm
                name={user.name}
                targetExamDate={user.targetExamDate ? user.targetExamDate.toISOString().slice(0, 10) : ""}
                examType={user.examType ?? ""}
                dailyGoalMinutes={user.dailyGoalMinutes}
                isGuest={user.isGuest}
              />
            </CardContent>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card>
            <CardHeader>
              <CardTitle>App-Einstellungen</CardTitle>
              <CardDescription>Gelten für dieses Gerät.</CardDescription>
            </CardHeader>
            <CardContent>
              <DeviceSettings />
            </CardContent>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card>
            <CardHeader>
              <CardTitle>Passwort ändern</CardTitle>
            </CardHeader>
            <CardContent>
              <PasswordForm />
            </CardContent>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <form action={logoutAction}>
            <Button type="submit" variant="outline">
              {user.isGuest ? "Gastmodus beenden" : "Abmelden"}
            </Button>
          </form>
        </StaggerItem>
      </Stagger>
    </div>
  );
}
