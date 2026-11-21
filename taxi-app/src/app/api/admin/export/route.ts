import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { serializeQuestionsCsv, type CsvRow } from "@/lib/csv";

const DIFF = { EASY: "LEICHT", MEDIUM: "MITTEL", HARD: "SCHWER" } as const;
const ORIGIN = { OFFICIAL: "OFFIZIELL", PRACTICE: "UEBUNG", DEMO: "DEMO" } as const;
const STATUS = { DRAFT: "ENTWURF", PUBLISHED: "VEROEFFENTLICHT", ARCHIVED: "ARCHIVIERT" } as const;

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return new Response("Keine Berechtigung", { status: 403 });
  const url = new URL(request.url);
  const where: Prisma.QuestionWhereInput = {};
  const category = url.searchParams.get("kategorie");
  const status = url.searchParams.get("status");
  if (category) where.category = { slug: category };
  if (status === "DRAFT" || status === "PUBLISHED" || status === "ARCHIVED") where.status = status;

  const questions = await prisma.question.findMany({
    where,
    include: { category: true, topic: true, source: true, options: { orderBy: { order: "asc" } } },
    orderBy: [{ category: { order: "asc" } }, { createdAt: "asc" }],
  });
  const rows: CsvRow[] = questions.map((q) => {
    const opt = (l: string) => q.options.find((o) => o.label === l);
    return {
      id: q.id,
      kategorie: q.category.slug,
      thema: q.topic?.name ?? "",
      frage: q.text,
      antwort_a: opt("A")?.text ?? "",
      antwort_b: opt("B")?.text ?? "",
      antwort_c: opt("C")?.text ?? "",
      antwort_d: opt("D")?.text ?? "",
      richtig: q.options.filter((o) => o.isCorrect).map((o) => o.label).join(","),
      erklaerung: q.explanation,
      erklaerung_a: opt("A")?.explanation ?? "",
      erklaerung_b: opt("B")?.explanation ?? "",
      erklaerung_c: opt("C")?.explanation ?? "",
      erklaerung_d: opt("D")?.explanation ?? "",
      schwierigkeit: DIFF[q.difficulty],
      herkunft: ORIGIN[q.origin],
      status: STATUS[q.status],
      quelle: q.source?.title ?? "",
      fundstelle: q.sourceDetail ?? "",
      tags: q.tags.join("|"),
      bild_url: q.imageUrl ?? "",
      merkhilfe: q.mnemonic ?? "",
    };
  });
  const date = new Date().toISOString().slice(0, 10);
  return new Response(serializeQuestionsCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fragen-export-${date}.csv"`,
    },
  });
}
