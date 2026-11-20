import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { publishedWhere } from "@/server/questions";

export interface RetrievedQuestion {
  id: string;
  text: string;
  category: string;
  explanation: string;
  legalReference: string | null;
  correctAnswers: string[];
}

const VOYAGE_MODEL = process.env.VOYAGE_MODEL || "voyage-3.5-lite";
const DIM = 1024;

export function embeddingsConfigured(): boolean {
  return Boolean(process.env.VOYAGE_API_KEY);
}

/** Embeddings über die Voyage-AI-API (Anthropic bietet selbst keine Embeddings an). */
async function embed(texts: string[], inputType: "query" | "document"): Promise<number[][]> {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.VOYAGE_API_KEY}` },
    body: JSON.stringify({ input: texts, model: VOYAGE_MODEL, input_type: inputType, output_dimension: DIM }),
  });
  if (!res.ok) throw new Error(`Voyage ${res.status}`);
  const json = (await res.json()) as { data: { embedding: number[]; index: number }[] };
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

let vectorSchemaCache: string | null | undefined;
/** Schema der pgvector-Erweiterung, falls installiert und die Embedding-Tabelle existiert. */
async function vectorSchema(): Promise<string | null> {
  if (vectorSchemaCache !== undefined) return vectorSchemaCache;
  const rows = await prisma.$queryRaw<{ nspname: string; has_table: boolean }[]>`
    SELECT n.nspname, to_regclass('"QuestionEmbedding"') IS NOT NULL AS has_table
    FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace WHERE e.extname = 'vector'`;
  const r = rows[0];
  vectorSchemaCache = r && r.has_table && /^[a-z_][a-z0-9_]*$/.test(r.nspname) ? r.nspname : null;
  return vectorSchemaCache;
}

async function hydrate(ids: string[]): Promise<RetrievedQuestion[]> {
  if (ids.length === 0) return [];
  const qs = await prisma.question.findMany({
    where: { id: { in: ids }, ...publishedWhere },
    select: { id: true, text: true, explanation: true, sourceDetail: true, category: { select: { name: true } }, options: { where: { isCorrect: true }, select: { text: true } } },
  });
  return ids.flatMap((id) => {
    const q = qs.find((x) => x.id === id);
    return q ? [{ id: q.id, text: q.text, category: q.category.name, explanation: q.explanation, legalReference: q.sourceDetail, correctAnswers: q.options.map((o) => o.text) }] : [];
  });
}

/** Die k relevantesten Fragen zu einer Anfrage (pgvector, sonst deutsche Volltextsuche). */
export async function retrieveQuestions(query: string, k = 5): Promise<RetrievedQuestion[]> {
  const q = query.slice(0, 500);
  const schema = embeddingsConfigured() ? await vectorSchema().catch(() => null) : null;
  if (schema) {
    try {
      const [vec] = await embed([q], "query");
      const literal = `[${vec.join(",")}]`;
      const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
        `SELECT e."questionId" AS id FROM "QuestionEmbedding" e JOIN "Question" q ON q."id" = e."questionId"
         WHERE q."status" = 'PUBLISHED'
         ORDER BY e."embedding" OPERATOR(${schema}.<=>) $1::${schema}.vector LIMIT ${Math.min(10, k)}`,
        literal,
      );
      if (rows.length) return hydrate(rows.map((r) => r.id));
    } catch (e) {
      console.error("Vektorsuche fehlgeschlagen, nutze Volltextsuche", e);
    }
  }
  const words = Array.from(new Set(q.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [])).slice(0, 12);
  if (words.length === 0) return [];
  const tsq = words.join(" | ");
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT q."id" FROM "Question" q
    WHERE q."status" = 'PUBLISHED'
      AND to_tsvector('german', coalesce(q."text", '') || ' ' || coalesce(q."explanation", '')) @@ to_tsquery('german', ${tsq})
    ORDER BY ts_rank(to_tsvector('german', coalesce(q."text", '') || ' ' || coalesce(q."explanation", '')), to_tsquery('german', ${tsq})) DESC
    LIMIT ${Math.min(10, k)}`;
  return hydrate(rows.map((r) => r.id));
}

/** Embeddings für alle veröffentlichten Fragen erstellen/aktualisieren (nur geänderte). */
export async function indexQuestionEmbeddings(): Promise<{ updated: number; total: number; skipped?: string }> {
  if (!embeddingsConfigured()) return { updated: 0, total: 0, skipped: "VOYAGE_API_KEY fehlt" };
  vectorSchemaCache = undefined;
  const schema = await vectorSchema();
  if (!schema) return { updated: 0, total: 0, skipped: "pgvector bzw. Tabelle QuestionEmbedding nicht vorhanden" };
  const questions = await prisma.question.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, text: true, explanation: true, sourceDetail: true, category: { select: { name: true } }, options: { orderBy: { order: "asc" }, select: { label: true, text: true } } },
  });
  const existing = await prisma.$queryRaw<{ questionId: string; contentHash: string }[]>`SELECT "questionId", "contentHash" FROM "QuestionEmbedding"`;
  const hashOf = new Map(existing.map((e) => [e.questionId, e.contentHash]));
  const docs = questions.map((q) => {
    const content = `${q.category.name}\n${q.text}\n${q.options.map((o) => `${o.label}) ${o.text}`).join("\n")}\nErklärung: ${q.explanation}${q.sourceDetail ? `\nQuelle: ${q.sourceDetail}` : ""}`;
    return { id: q.id, content, hash: createHash("sha256").update(content).digest("hex") };
  });
  const todo = docs.filter((d) => hashOf.get(d.id) !== d.hash);
  for (let i = 0; i < todo.length; i += 64) {
    const batch = todo.slice(i, i + 64);
    const vectors = await embed(batch.map((b) => b.content), "document");
    for (let j = 0; j < batch.length; j++) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "QuestionEmbedding" ("questionId", "embedding", "contentHash", "updatedAt") VALUES ($1, $2::${schema}.vector, $3, NOW())
         ON CONFLICT ("questionId") DO UPDATE SET "embedding" = EXCLUDED."embedding", "contentHash" = EXCLUDED."contentHash", "updatedAt" = NOW()`,
        batch[j].id,
        `[${vectors[j].join(",")}]`,
        batch[j].hash,
      );
    }
  }
  return { updated: todo.length, total: docs.length };
}
