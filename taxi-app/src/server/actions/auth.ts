"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, requireUser } from "@/lib/auth/session";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { loginSchema, passwordSchema, registerSchema } from "@/lib/validation";
import { z } from "zod";
import { DEMO_EMAIL, isDemoEmail, isDemoLoginEnabled } from "@/lib/demo";

export interface FormState {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

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
  const region = await prisma.region.findFirst({ where: { code: "W" } });
  const user = await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password), role: "STUDENT", regionId: region?.id, lastLoginAt: new Date() },
  });
  await createSession({ sub: user.id, role: user.role, name: user.name });
  redirect("/dashboard");
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
  redirect(safeRedirectTarget(formData.get("next")));
}

export async function demoLoginAction(): Promise<FormState> {
  if (!isDemoLoginEnabled()) return { error: "Der Demo-Zugang ist derzeit nicht verfügbar." };
  const ip = await clientIp();
  if (!rateLimit(`demo:${ip}`, 20, 15 * 60 * 1000).ok) {
    return { error: "Zu viele Demo-Anmeldungen. Bitte in ein paar Minuten erneut versuchen." };
  }
  const user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user || !user.isActive || user.role !== "STUDENT") return { error: "Der Demo-Zugang ist derzeit nicht verfügbar." };
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession({ sub: user.id, role: user.role, name: user.name });
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Bitte den Namen angeben.").max(120),
  targetExamDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
});

const DEMO_LOCKED = "Im Demo-Konto nicht möglich. Erstelle ein eigenes Konto, um dein Profil zu ändern.";

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (isDemoEmail(user.email)) return { error: DEMO_LOCKED };
  const parsed = profileSchema.safeParse({ name: formData.get("name"), targetExamDate: formData.get("targetExamDate") ?? "" });
  if (!parsed.success) return { error: "Bitte Eingaben prüfen.", fieldErrors: parsed.error.flatten().fieldErrors };
  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      targetExamDate: parsed.data.targetExamDate ? new Date(`${parsed.data.targetExamDate}T00:00:00Z`) : null,
    },
  });
  return { success: "Profil gespeichert." };
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (isDemoEmail(user.email)) return { error: DEMO_LOCKED };
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
