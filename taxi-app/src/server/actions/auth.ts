"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, requireUser } from "@/lib/auth/session";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { loginSchema, passwordSchema, registerSchema } from "@/lib/validation";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { getCurrentUser } from "@/lib/auth/session";

export interface FormState {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Ziel nach erfolgreicher Anmeldung – der Client spielt erst die Abfahrt-Animation ab. */
  redirectTo?: string;
}

const GUEST_TTL_DAYS = 30;

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

function safeRedirectTarget(value: FormDataEntryValue | null): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : "/dashboard";
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ip = await clientIp();
  if (!rateLimit(`register:${ip}`, 10, 60 * 60 * 1000).ok) {
    return { error: "Zu viele Registrierungen. Bitte später erneut versuchen." };
  }
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Bitte Eingaben prüfen.", fieldErrors: parsed.error.flatten().fieldErrors };
  if (formData.get("password") !== formData.get("passwordConfirm")) {
    return { error: "Bitte Eingaben prüfen.", fieldErrors: { passwordConfirm: ["Die Passwörter stimmen nicht überein."] } };
  }
  if (formData.get("terms") !== "on") {
    return { error: "Bitte den Nutzungshinweis bestätigen.", fieldErrors: { terms: ["Bestätigung erforderlich."] } };
  }
  const { name, email, password } = parsed.data;
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { error: "Mit dieser E-Mail-Adresse existiert bereits ein Konto." };
  const passwordHash = await hashPassword(password);

  // Angemeldeter Gast: Konto umwandeln, Lernfortschritt bleibt erhalten
  const current = await getCurrentUser();
  if (current?.isGuest) {
    const user = await prisma.user.update({
      where: { id: current.id },
      data: { name, email, passwordHash, isGuest: false, lastLoginAt: new Date() },
    });
    await createSession({ sub: user.id, role: user.role, name: user.name });
    return { redirectTo: user.onboardedAt ? "/dashboard" : "/willkommen" };
  }

  const region = await prisma.region.findFirst({ where: { code: "W" } });
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: "STUDENT", regionId: region?.id, lastLoginAt: new Date() },
  });
  await createSession({ sub: user.id, role: user.role, name: user.name });
  return { redirectTo: "/willkommen" };
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Bitte E-Mail und Passwort eingeben.", fieldErrors: parsed.error.flatten().fieldErrors };
  const ip = await clientIp();
  const key = `login:${ip}:${parsed.data.email}`;
  const limit = rateLimit(key, 8, 15 * 60 * 1000);
  if (!limit.ok) return { error: `Zu viele Anmeldeversuche. Bitte in ${Math.ceil(limit.retryAfterSec / 60)} Minuten erneut versuchen.` };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  // Immer einen Hash vergleichen, um Timing-Unterschiede zu vermeiden
  const valid = await verifyPassword(parsed.data.password, user?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva");
  if (!user || !valid) return { error: "E-Mail oder Passwort ist falsch." };
  if (!user.isActive) return { error: "Dieses Konto wurde deaktiviert. Bitte wende dich an den Support." };
  resetRateLimit(key);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession({ sub: user.id, role: user.role, name: user.name });
  return { redirectTo: safeRedirectTarget(formData.get("next")) };
}

/** „Als Gast testen": legt ein eigenes, anonymes Konto für dieses Gerät an (kein geteiltes Demo-Konto). */
export async function guestLoginAction(): Promise<FormState> {
  const ip = await clientIp();
  if (!rateLimit(`guest:${ip}`, 10, 60 * 60 * 1000).ok) {
    return { error: "Zu viele Gastzugänge von diesem Netzwerk. Bitte später erneut versuchen." };
  }
  // Verwaiste Gastkonten aufräumen (seit 30 Tagen nicht genutzt)
  await prisma.user.deleteMany({
    where: { isGuest: true, lastLoginAt: { lt: new Date(Date.now() - GUEST_TTL_DAYS * 24 * 60 * 60 * 1000) } },
  });
  const region = await prisma.region.findFirst({ where: { code: "W" } });
  const user = await prisma.user.create({
    data: {
      email: `gast-${randomUUID()}@gast.invalid`,
      name: "Gast",
      // Kein gültiger bcrypt-Hash → Passwort-Anmeldung ist für Gastkonten unmöglich
      passwordHash: "!guest",
      role: "STUDENT",
      isGuest: true,
      regionId: region?.id,
      lastLoginAt: new Date(),
    },
  });
  await createSession({ sub: user.id, role: user.role, name: user.name, guest: true });
  return { redirectTo: "/willkommen" };
}

export async function logoutAction() {
  // Gastkonten haben keine Zugangsdaten – beim Abmelden werden sie entfernt
  const current = await getCurrentUser();
  if (current?.isGuest) await prisma.user.delete({ where: { id: current.id } }).catch(() => undefined);
  await destroySession();
  redirect("/login");
}

const onboardingSchema = z.object({
  examType: z.enum(["TAXILENKER", "KONZESSION"]),
  targetExamDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
  dailyGoalMinutes: z.coerce.number().int().refine((v) => [10, 20, 30].includes(v), "Bitte ein Tagesziel wählen."),
});

/** Abschluss des 3-Schritte-Onboardings. */
export async function completeOnboardingAction(input: { examType: string; targetExamDate: string; dailyGoalMinutes: number }): Promise<FormState> {
  const user = await requireUser();
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { error: "Bitte alle Schritte ausfüllen." };
  await prisma.user.update({
    where: { id: user.id },
    data: {
      examType: parsed.data.examType,
      targetExamDate: parsed.data.targetExamDate ? new Date(`${parsed.data.targetExamDate}T00:00:00Z`) : null,
      dailyGoalMinutes: parsed.data.dailyGoalMinutes,
      onboardedAt: new Date(),
    },
  });
  return { redirectTo: "/dashboard" };
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Bitte den Namen angeben.").max(120),
  targetExamDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
  examType: z.union([z.literal(""), z.enum(["TAXILENKER", "KONZESSION"])]),
  dailyGoalMinutes: z.union([z.literal(""), z.coerce.number().int().refine((v) => [10, 20, 30].includes(v))]),
});

const GUEST_LOCKED = "Im Gastmodus nicht möglich. Erstelle ein kostenloses Konto, um dein Profil zu ändern.";

/** Name (nicht im Gastmodus), Prüfungstermin, Prüfungsart und Tagesziel speichern. */
export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    name: user.isGuest ? user.name : formData.get("name"),
    targetExamDate: formData.get("targetExamDate") ?? "",
    examType: formData.get("examType") ?? "",
    dailyGoalMinutes: formData.get("dailyGoalMinutes") ?? "",
  });
  if (!parsed.success) return { error: "Bitte Eingaben prüfen.", fieldErrors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(user.isGuest ? {} : { name: d.name }),
      targetExamDate: d.targetExamDate ? new Date(`${d.targetExamDate}T00:00:00Z`) : null,
      ...(d.examType ? { examType: d.examType } : {}),
      ...(d.dailyGoalMinutes ? { dailyGoalMinutes: d.dailyGoalMinutes } : {}),
    },
  });
  return { success: "Profil gespeichert." };
}

/** Avatar wählen (auch im Gastmodus erlaubt). */
export async function setAvatarAction(key: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const { AVATARS } = await import("@/lib/avatars");
  if (!AVATARS.some((a) => a.key === key)) return { ok: false };
  await prisma.user.update({ where: { id: user.id }, data: { avatar: key } });
  return { ok: true };
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (user.isGuest) return { error: GUEST_LOCKED };
  const current = String(formData.get("currentPassword") ?? "");
  const next = passwordSchema.safeParse(formData.get("newPassword"));
  if (!next.success) return { error: "Bitte Eingaben prüfen.", fieldErrors: { newPassword: next.error.issues.map((i) => i.message) } };
  if (formData.get("newPassword") !== formData.get("newPasswordConfirm")) {
    return { error: "Bitte Eingaben prüfen.", fieldErrors: { newPasswordConfirm: ["Die Passwörter stimmen nicht überein."] } };
  }
  const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(current, row.passwordHash))) return { error: "Das aktuelle Passwort ist falsch." };
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next.data) } });
  return { success: "Passwort geändert." };
}

/** Design (Theme) und Hell/Dunkel-Modus im Profil speichern. */
export async function setThemeAction(theme: string, mode: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  const { isThemeId, isThemeMode } = await import("@/lib/theme/themes");
  if (!isThemeId(theme) || !isThemeMode(mode)) return { ok: false };
  await prisma.user.update({ where: { id: user.id }, data: { theme, themeMode: mode } });
  return { ok: true };
}
