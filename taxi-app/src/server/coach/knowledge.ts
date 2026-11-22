import "server-only";
import { prisma } from "@/lib/db";

export type KnowledgeHit = {
  id: string;
  kind: "question" | "faq" | "chapter" | "summary" | "number";
  refId: string;
  title: string;
  body: string;
  category: string | null;
  chapter: string | null;
  route: string | null;
  extra: Record<string, unknown>;
  rank: number;
  snippet: string;
};

type Row = { id: string; kind: KnowledgeHit["kind"]; ref_id: string; title: string; body: string; category: string | null; chapter: string | null; route: string | null; extra: Record<string, unknown> | null; rank: number; snippet: string | null };

/** Volltext + Trigramm-Suche in der Wissensbasis (RPC search_knowledge). */
export async function searchKnowledge(q: string, limit = 10): Promise<KnowledgeHit[]> {
  const query = q.trim().slice(0, 200);
  if (query.length < 2) return [];
  try {
    const rows = await prisma.$queryRaw<Row[]>`SELECT * FROM search_knowledge(${query}, ${limit}::int)`;
    return rows.map((r) => ({ id: r.id, kind: r.kind, refId: r.ref_id, title: r.title, body: r.body, category: r.category, chapter: r.chapter, route: r.route, extra: r.extra ?? {}, rank: Number(r.rank), snippet: r.snippet ?? "" }));
  } catch {
    return [];
  }
}

/** Wissensbasis neu aufbauen (nach Seed, Import oder Bearbeitung). Fehler werden ignoriert. */
export async function refreshKnowledge(): Promise<void> {
  await prisma.$executeRawUnsafe("REFRESH MATERIALIZED VIEW coach_knowledge").catch(() => undefined);
}
