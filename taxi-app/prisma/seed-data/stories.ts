/** Story-Startinhalte: Platzhalter-Illustrationen (Emoji + Farbverlauf), keine fremden Fotos. Ungeprüft (verified=false). */
export type SeedSlide = { emoji: string; bg: string; title: string; body: string; cta?: { label: string; route: string }; map?: { lat: number; lng: number; label: string } };
export type SeedGroup = { key: string; title: string; icon: string; type: string; personal?: boolean; sort: number; ring?: string[]; slides: SeedSlide[] };

export const STORY_GROUPS: SeedGroup[] = [
  { key: "toni", title: "Toni sagt", icon: "🚕", type: "toni", personal: true, sort: 0, ring: ["#FFC400", "#111111", "#FFC400"], slides: [] },
  {
    key: "tipp", title: "Tipp des Tages", icon: "💡", type: "tipp", sort: 10,
    slides: [
      { emoji: "⏱️", bg: "linear-gradient(160deg,#111,#854d0e)", title: "Lieber oft und kurz", body: "Jeden Tag 10 Minuten bringen mehr als einmal pro Woche zwei Stunden. Dein Gehirn speichert Wiederholungen besser.", cta: { label: "3-Min-Lektion", route: "/lernen" } },
      { emoji: "🗣️", bg: "linear-gradient(160deg,#1e3a8a,#2563eb)", title: "Laut antworten", body: "In der mündlichen Prüfung zählt, dass du frei sprichst. Übe Antworten laut – auch wenn du allein bist.", cta: { label: "Mündlich üben", route: "/muendlich" } },
      { emoji: "❌", bg: "linear-gradient(160deg,#7c2d12,#ea580c)", title: "Fehler sind Gold", body: "Falsche Antworten zeigen dir genau, was du noch lernen musst. Wiederhole sie gezielt im Fehlertraining.", cta: { label: "Fehler trainieren", route: "/fehler" } },
    ],
  },
  {
    key: "ort", title: "Wien-Ort", icon: "📍", type: "ort", sort: 20, ring: ["#2563EB", "#60A5FA", "#FFC400"],
    slides: [
      { emoji: "🏛️", bg: "linear-gradient(160deg,#0f172a,#1e3a8a)", title: "Stephansdom", body: "1. Bezirk – Innere Stadt. Das Herz der Stadt und beliebter Treffpunkt.", map: { lat: 48.20849, lng: 16.37307, label: "Stephansdom" } },
      { emoji: "🚉", bg: "linear-gradient(160deg,#111,#3f3f46)", title: "Bahnhof Praterstern", body: "2. Bezirk – Leopoldstadt. Großer Umsteigeknoten beim Prater.", map: { lat: 48.21815, lng: 16.39206, label: "Praterstern" } },
      { emoji: "🏥", bg: "linear-gradient(160deg,#064e3b,#059669)", title: "AKH Wien", body: "9. Bezirk – Alsergrund. Größtes Spital Österreichs.", map: { lat: 48.2205, lng: 16.3468, label: "AKH Wien" } },
    ],
  },
  {
    key: "regel", title: "Regel des Tages", icon: "⚖️", type: "regel", sort: 30, ring: ["#EA580C", "#F59E0B", "#111111"],
    slides: [
      { emoji: "§", bg: "linear-gradient(160deg,#111827,#7c2d12)", title: "Gesetze kennen", body: "In der Prüfung wird oft nach Paragraphen gefragt. Merk dir das Gesetz und worum es grob geht – nicht nur die Nummer.", cta: { label: "Lernbuch öffnen", route: "/lernbuch" } },
      { emoji: "📜", bg: "linear-gradient(160deg,#7c2d12,#ea580c)", title: "Betriebsordnung", body: "Die Betriebsordnung regelt Pflichten im Taxibetrieb – z. B. Verhalten gegenüber Fahrgästen und Fahrzeugausstattung." },
      { emoji: "🧾", bg: "linear-gradient(160deg,#1e293b,#475569)", title: "Quellen prüfen", body: "Rechtslagen ändern sich. Prüfe Angaben immer mit den aktuellen offiziellen Unterlagen." },
    ],
  },
  {
    key: "zahl", title: "Zahl des Tages", icon: "🔢", type: "zahl", sort: 40, ring: ["#059669", "#34D399", "#FFC400"],
    slides: [
      { emoji: "🔢", bg: "linear-gradient(160deg,#111,#854d0e)", title: "Zahlen merken", body: "Fristen, Promillegrenzen, Abstände: Zahlen werden gern gefragt. Übe sie im Zahlen-Trainer.", cta: { label: "Zahlen-Trainer", route: "/zahlen" } },
      { emoji: "🧮", bg: "linear-gradient(160deg,#064e3b,#059669)", title: "Eselsbrücken", body: "Verknüpfe Zahlen mit Bildern oder Geschichten – so bleiben sie viel besser hängen." },
      { emoji: "📅", bg: "linear-gradient(160deg,#1e3a8a,#2563eb)", title: "Fristen", body: "Bei Fristen auf die Einheit achten: Tage, Wochen oder Monate? Genau lesen lohnt sich." },
    ],
  },
  {
    key: "quiz", title: "Quiz", icon: "❓", type: "quiz", sort: 50, ring: ["#2563EB", "#FFC400", "#F59E0B"],
    slides: [
      { emoji: "❓", bg: "linear-gradient(160deg,#111,#1e3a8a)", title: "Dein Quiz", body: "Hier bekommst du täglich Fragen, die gerade für dich fällig sind.", cta: { label: "Quiz starten", route: "/quiz" } },
      { emoji: "🎯", bg: "linear-gradient(160deg,#1e3a8a,#2563eb)", title: "Treffsicher werden", body: "Jede Antwort zählt für deine Wiederholung – richtige Antworten wandern ein Fach weiter." },
      { emoji: "🔁", bg: "linear-gradient(160deg,#854d0e,#f59e0b)", title: "Wiederholen", body: "Fällige Fragen kommen genau dann, wenn du sie fast vergessen hättest.", cta: { label: "Wiederholen", route: "/ueben/wiederholung" } },
    ],
  },
  { key: "woche", title: "Deine Woche", icon: "📊", type: "woche", personal: true, sort: 60, slides: [] },
  { key: "erfolg", title: "Erfolge", icon: "🏆", type: "erfolg", personal: true, sort: 70, ring: ["#FACC15", "#F59E0B", "#FDE68A"], slides: [] },
];
