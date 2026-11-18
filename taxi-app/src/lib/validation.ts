import { z } from "zod";

export const difficultyEnum = z.enum(["EASY", "MEDIUM", "HARD"]);
export const statusEnum = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);
export const originEnum = z.enum(["OFFICIAL", "PRACTICE", "DEMO"]);
export const sourceTypeEnum = z.enum(["LAW", "OFFICIAL_EXAM", "OFFICIAL_DOCUMENT", "TEXTBOOK", "OTHER"]);

export const passwordSchema = z
  .string()
  .min(10, "Das Passwort muss mindestens 10 Zeichen lang sein.")
  .max(128, "Das Passwort ist zu lang.")
  .regex(/[A-Za-zÄÖÜäöüß]/, "Das Passwort muss Buchstaben enthalten.")
  .regex(/[0-9]/, "Das Passwort muss mindestens eine Ziffer enthalten.");

export const emailSchema = z.string().trim().toLowerCase().email("Bitte eine gültige E-Mail-Adresse eingeben.").max(254);

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Bitte den Namen angeben.").max(120),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Bitte das Passwort eingeben.").max(128),
});

export const answerOptionSchema = z.object({
  label: z.enum(["A", "B", "C", "D"]),
  text: z.string().trim().min(1, "Antworttext fehlt."),
  isCorrect: z.boolean(),
  explanation: z.string().trim().max(5000).optional().nullable(),
});

export const questionSchema = z
  .object({
    text: z.string().trim().min(5, "Der Fragetext ist zu kurz.").max(5000),
    explanation: z.string().trim().min(5, "Bitte eine Erklärung angeben.").max(10000),
    categoryId: z.string().min(1, "Bitte eine Kategorie wählen."),
    topicId: z.string().optional().nullable(),
    difficulty: difficultyEnum,
    multipleCorrect: z.boolean(),
    imageUrl: z
      .string()
      .trim()
      .max(500)
      .refine((v) => v === "" || v.startsWith("/") || /^https:\/\//.test(v), "Bild-URL muss mit https:// oder / beginnen.")
      .optional()
      .nullable(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20),
    status: statusEnum,
    origin: originEnum,
    sourceId: z.string().optional().nullable(),
    sourceDetail: z.string().trim().max(255).optional().nullable(),
    options: z.array(answerOptionSchema).length(4, "Es werden genau vier Antwortmöglichkeiten (A–D) benötigt."),
  })
  .superRefine((q, ctx) => {
    const correct = q.options.filter((o) => o.isCorrect).length;
    if (correct === 0) ctx.addIssue({ code: "custom", path: ["options"], message: "Mindestens eine Antwort muss richtig sein." });
    if (!q.multipleCorrect && correct > 1)
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Bei Einfachauswahl darf nur eine Antwort richtig sein (oder „Mehrfachauswahl“ aktivieren).",
      });
    const labels = new Set(q.options.map((o) => o.label));
    if (labels.size !== 4) ctx.addIssue({ code: "custom", path: ["options"], message: "Die Labels A–D müssen eindeutig sein." });
  });

export type QuestionInput = z.infer<typeof questionSchema>;

export const CATEGORY_COLOR_KEYS = ["blue", "indigo", "violet", "emerald", "amber", "rose", "cyan", "orange", "teal", "sky", "slate"] as const;

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug: nur Kleinbuchstaben, Ziffern und Bindestriche."),
  shortDescription: z.string().trim().min(2).max(300),
  introduction: z.string().trim().min(2).max(20000),
  color: z.enum(CATEGORY_COLOR_KEYS),
  icon: z.string().trim().min(1).max(40),
  order: z.coerce.number().int().min(0).max(1000),
  difficulty: difficultyEnum,
  isActive: z.boolean(),
  syllabusReference: z.string().trim().max(5000).optional().nullable(),
  syllabusVerified: z.boolean(),
});

export const topicSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(5000).optional().nullable(),
});

export const examConfigSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(5000).optional().nullable(),
  durationMinutes: z.coerce.number().int().min(1, "Mindestens 1 Minute.").max(600),
  questionCount: z.coerce.number().int().min(1, "Mindestens 1 Frage.").max(500),
  passPercentage: z.coerce.number().int().min(1).max(100),
  isActive: z.boolean(),
  isDefault: z.boolean(),
  verified: z.boolean(),
  officialReference: z.string().trim().max(5000).optional().nullable(),
  allowedOrigins: z.array(originEnum),
  categoryDistribution: z.record(z.string(), z.coerce.number().int().min(0).max(500)).optional().nullable(),
});

export const sourceSchema = z.object({
  title: z.string().trim().min(2).max(255),
  type: sourceTypeEnum,
  reference: z.string().trim().max(255).optional().nullable(),
  url: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https?:\/\//.test(v), "URL muss mit http(s):// beginnen.")
    .optional()
    .nullable(),
  verified: z.boolean(),
  note: z.string().trim().max(5000).optional().nullable(),
});

export const quizSettingsSchema = z.object({
  count: z.coerce.number().int().min(1).max(200),
  categoryIds: z.array(z.string()).default([]),
  difficulty: z.union([difficultyEnum, z.literal("ALL")]).default("ALL"),
});
