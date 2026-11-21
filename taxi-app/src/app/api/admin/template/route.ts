import { getCurrentUser } from "@/lib/auth/session";
import { serializeQuestionsCsv } from "@/lib/csv";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return new Response("Keine Berechtigung", { status: 403 });
  const csv = serializeQuestionsCsv([
    {
      id: "",
      kategorie: "stvo",
      thema: "Geschwindigkeit",
      frage: "Beispiel: Welche Höchstgeschwindigkeit gilt grundsätzlich im Ortsgebiet?",
      antwort_a: "30 km/h",
      antwort_b: "50 km/h",
      antwort_c: "70 km/h",
      antwort_d: "80 km/h",
      richtig: "B",
      erklaerung: "Im Ortsgebiet gilt grundsätzlich 50 km/h, sofern keine andere Beschränkung kundgemacht ist.",
      erklaerung_a: "30 km/h gilt nur, wenn es eigens verordnet ist.",
      erklaerung_b: "Richtig.",
      erklaerung_c: "Falsch.",
      erklaerung_d: "Falsch.",
      schwierigkeit: "LEICHT",
      herkunft: "UEBUNG",
      status: "ENTWURF",
      quelle: "Straßenverkehrsordnung 1960 (StVO)",
      fundstelle: "§ 20 Abs. 2 StVO",
      tags: "geschwindigkeit|ortsgebiet",
      bild_url: "",
      merkhilfe: "",
    },
  ]);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="fragen-vorlage.csv"',
    },
  });
}
