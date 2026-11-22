import Papa from "papaparse";
import { getCurrentUser } from "@/lib/auth/session";
import { questionsWithoutExplanation } from "@/server/explanations";

/** CSV-Export: Fragen ohne Erklärung → offline ergänzen → wieder importieren. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return new Response("Keine Berechtigung", { status: 403 });
  const rows = await questionsWithoutExplanation();
  const csv = Papa.unparse(
    rows.map((r) => ({ question_id: r.id, kapitel: r.category, frage: r.text, antwort: r.answer, explanation_de: "", mnemonic_de: r.mnemonic ?? "", simple_de: r.simple ?? "" })),
    { columns: ["question_id", "kapitel", "frage", "antwort", "explanation_de", "mnemonic_de", "simple_de"] },
  );
  return new Response(`﻿${csv}`, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="fehlende-erklaerungen.csv"` },
  });
}
