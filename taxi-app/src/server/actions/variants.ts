"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { isHelperLang } from "@/lib/languages";
import { coachQuota, LIMIT_REACHED } from "@/server/coach/limits";
import { coachConfigured, coachErrorMessage } from "@/server/coach/llm";
import { publishedWhere } from "@/server/questions";
import { generateSimple, generateTranslation, getVariant, type GlossaryContent, type SimpleContent, type TranslationContent } from "@/server/variants";

type Result<T> = { ok: true; data: T } | { ok: false; error: string; limitReached?: boolean };

const idSchema = z.string().min(1).max(64);

async function canGenerate(user: { id: string; role: string }): Promise<Result<null>> {
  if (!coachConfigured()) return { ok: false, error: "Die KI-Hilfe ist noch nicht eingerichtet." };
  const quota = await coachQuota(user);
  if (quota.remaining <= 0) return { ok: false, error: LIMIT_REACHED, limitReached: true };
  return { ok: true, data: null };
}

async function countAiCall(userId: string, label: string) {
  await prisma.coachMessage.create({ data: { userId, kind: "ai", role: "user", content: label } });
}

export interface SimpleView {
  variantId: string;
  verified: boolean;
  text: string;
  options: { id: string; label: string; text: string }[];
  glossary: { term: string; definition: string }[];
}

/** „Einfach“-Ansicht (B1) inkl. Glossar – aus dem Cache oder einmalig erzeugt. */
export async function getSimpleAction(questionId: string): Promise<Result<SimpleView>> {
  const user = await requireUser();
  const id = idSchema.parse(questionId);
  const q = await prisma.question.findFirst({ where: { id, ...publishedWhere }, select: { id: true, options: { orderBy: { order: "asc" }, select: { id: true, label: true, text: true } } } });
  if (!q) return { ok: false, error: "Frage nicht gefunden." };
  let simple = await getVariant<SimpleContent>(id, "simple");
  let glossary = await getVariant<GlossaryContent>(id, "glossary");
  if (!simple) {
    const gate = await canGenerate(user);
    if (!gate.ok) return gate;
    try {
      const out = await generateSimple(id);
      if (!out) return { ok: false, error: "Die Vereinfachung hat nicht geklappt – bitte später erneut versuchen." };
      await countAiCall(user.id, `simple:${id}`);
      simple = out.simple;
      glossary = out.glossary;
    } catch (err) {
      return { ok: false, error: coachErrorMessage(err) };
    }
  }
  const opts = simple.content.options;
  return {
    ok: true,
    data: {
      variantId: simple.id,
      verified: simple.verified,
      text: simple.content.text,
      options: q.options.map((o) => ({ id: o.id, label: o.label, text: opts.find((x) => x.label === o.label)?.text ?? o.text })),
      glossary: glossary?.content.terms ?? [],
    },
  };
}

export interface TranslationView {
  variantId: string;
  verified: boolean;
  lang: string;
  question: string;
  options: { label: string; text: string }[];
  /** nur nach dem Beantworten (verrät sonst die Lösung) */
  explanation: string | null;
}

/** Übersetzungshilfe – aus dem Cache oder einmalig erzeugt. */
export async function getTranslationAction(questionId: string, lang: string): Promise<Result<TranslationView>> {
  const user = await requireUser();
  const id = idSchema.parse(questionId);
  if (!isHelperLang(lang)) return { ok: false, error: "Sprache nicht verfügbar." };
  const q = await prisma.question.findFirst({ where: { id, ...publishedWhere }, select: { id: true } });
  if (!q) return { ok: false, error: "Frage nicht gefunden." };
  let v = await getVariant<TranslationContent>(id, "translation", lang);
  if (!v) {
    const gate = await canGenerate(user);
    if (!gate.ok) return gate;
    try {
      v = await generateTranslation(id, lang);
      if (!v) return { ok: false, error: "Die Übersetzung hat nicht geklappt – bitte später erneut versuchen." };
      await countAiCall(user.id, `translation:${lang}:${id}`);
    } catch (err) {
      return { ok: false, error: coachErrorMessage(err) };
    }
  }
  const answered =
    (await prisma.userAnswer.findFirst({ where: { userId: user.id, questionId: id }, select: { id: true } })) ??
    (await prisma.readProgress.findFirst({ where: { userId: user.id, questionId: id }, select: { id: true } }));
  return { ok: true, data: { variantId: v.id, verified: v.verified, lang, question: v.content.question, options: v.content.options, explanation: answered ? (v.content.explanation ?? null) : null } };
}

/** 👍/👎 zu einer KI-Variante (👎 → Prüf-Warteschlange im Admin-Bereich). */
export async function rateVariantAction(variantId: string, rating: 1 | -1 | 0): Promise<void> {
  const user = await requireUser();
  const id = idSchema.parse(variantId);
  const r = z.union([z.literal(1), z.literal(-1), z.literal(0)]).parse(rating);
  if (r === 0) {
    await prisma.variantFeedback.deleteMany({ where: { variantId: id, userId: user.id } });
    return;
  }
  const exists = await prisma.questionVariant.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return;
  await prisma.variantFeedback.upsert({ where: { variantId_userId: { variantId: id, userId: user.id } }, create: { variantId: id, userId: user.id, rating: r }, update: { rating: r } });
}

/** Hilfssprache im Profil speichern. */
export async function setHelperLangAction(lang: string): Promise<{ ok: boolean }> {
  const user = await requireUser();
  if (!isHelperLang(lang)) return { ok: false };
  await prisma.user.update({ where: { id: user.id }, data: { helperLang: lang } });
  return { ok: true };
}
