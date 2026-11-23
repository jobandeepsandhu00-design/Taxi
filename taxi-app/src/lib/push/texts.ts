/** Benachrichtigungstexte (du-Form, kurz) mit Varianten – rotiert, nie zweimal derselbe Text hintereinander. */
export type PushType = "daily" | "due" | "streak" | "lernbuch" | "challenge" | "exam" | "weekly" | "duel" | "achievement" | "story" | "test";

type Tpl = { title: string; body: string };

export const PUSH_TEXTS: Record<PushType, Tpl[]> = {
  daily: [
    { title: "🚕 5 Minuten für deine Prüfung?", body: "{n} Fragen warten auf dich." },
    { title: "🚕 Kurze Runde gefällig?", body: "Schon 5 Minuten bringen dich weiter – {n} Fragen sind bereit." },
    { title: "🚕 Toni wartet auf dich", body: "Eine Mini-Lektion, dann hast du's für heute." },
    { title: "🚕 Zeit zum Lernen", body: "Heute schon geübt? {n} Fragen warten." },
    { title: "🚕 Bleib dran!", body: "Kleine Schritte, große Wirkung – starte eine 5-Minuten-Runde." },
  ],
  due: [
    { title: "🔁 Wiederholung fällig", body: "{n} Fragen sind heute fällig – kurz wiederholen?" },
    { title: "🔁 {n} Fragen warten", body: "Jetzt wiederholen, damit sie sitzen." },
    { title: "🔁 Gedächtnis auffrischen", body: "{n} Karten sind dran – das dauert nur ein paar Minuten." },
    { title: "🔁 Perfekter Zeitpunkt", body: "Genau jetzt wiederholt, bleibt's am längsten hängen: {n} Fragen." },
  ],
  streak: [
    { title: "🔥 Deine Serie ist in Gefahr!", body: "{n} Tage in Folge – eine Lektion reicht heute." },
    { title: "🔥 {n}-Tage-Serie retten", body: "Noch nicht gelernt heute? Ein paar Fragen halten sie am Leben." },
    { title: "🔥 Nicht abreißen lassen!", body: "Deine {n}-Tage-Serie braucht nur eine kurze Runde." },
    { title: "🔥 Fast verpasst!", body: "Schnell 5 Fragen – und deine {n}-Tage-Serie bleibt." },
  ],
  lernbuch: [
    { title: "📖 Weiterlesen", body: "{chapter} ({left} Karten übrig)" },
    { title: "📖 Dein Lernbuch wartet", body: "Mach weiter mit {chapter} – noch {left} Karten." },
    { title: "📖 Kapitel fast geschafft", body: "{chapter}: nur noch {left} Karten." },
  ],
  challenge: [
    { title: "⚡ Daily Challenge ist da", body: "Schaffst du heute 5/5?" },
    { title: "⚡ Neue Challenge", body: "5 Fragen, ein Ziel: alles richtig. Los geht's!" },
    { title: "⚡ Tagesaufgabe wartet", body: "Die heutige Daily Challenge ist freigeschaltet." },
  ],
  exam: [
    { title: "📅 Noch {days} Tage bis zur Prüfung", body: "Prüfungsreife: {score} % – weiter so!" },
    { title: "📅 Countdown: {days} Tage", body: "Deine Prüfungsreife liegt bei {score} %. Heute eine Simulation?" },
    { title: "📅 {days} Tage bis zum Termin", body: "Prüfungsreife {score} % – jede Runde zählt." },
  ],
  weekly: [
    { title: "📊 Dein Wochenbericht ist fertig", body: "{accuracy} % richtig diese Woche!" },
    { title: "📊 Wochenrückblick", body: "Diese Woche: {accuracy} % richtig. Schau dir deine Stärken an." },
    { title: "📊 So lief deine Woche", body: "{accuracy} % richtig – Toni hat Tipps für dich." },
  ],
  duel: [
    { title: "⚔️ Duell!", body: "{name} fordert dich zum Duell heraus!" },
    { title: "⚔️ Herausforderung", body: "{name} ist bereit – zeig, was du kannst!" },
    { title: "⚔️ {name} wartet", body: "Dein Duell kann losgehen." },
  ],
  achievement: [
    { title: "🏆 Neues Abzeichen!", body: "{name} freigeschaltet." },
    { title: "🏆 Geschafft!", body: "Du hast „{name}“ erreicht." },
    { title: "🏆 Stark!", body: "Abzeichen „{name}“ ist deins." },
  ],
  story: [
    { title: "📍 Neuer Wien-Ort des Tages", body: "{place} – schau dir die Story an!" },
    { title: "📍 Wien-Ort des Tages: {place}", body: "Wo liegt das? Teste dich in der Story." },
    { title: "📍 Heute: {place}", body: "Neue Story mit Karte und Kurz-Check wartet auf dich." },
  ],
  test: [{ title: "✅ Test-Benachrichtigung", body: "So sehen deine Erinnerungen aus. Alles funktioniert!" }],
};

export function fill(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => (vars[k] !== undefined ? String(vars[k]) : ""));
}

/** Wählt eine Variante; `lastBody` (zuletzt gesendeter Text dieses Typs) wird vermieden. */
export function pickText(type: PushType, vars: Record<string, string | number>, lastBody?: string | null, rand: () => number = Math.random): Tpl {
  const all = PUSH_TEXTS[type].map((t) => ({ title: fill(t.title, vars), body: fill(t.body, vars) }));
  const pool = all.length > 1 && lastBody ? all.filter((t) => t.body !== lastBody) : all;
  return pool[Math.floor(rand() * pool.length) % pool.length]!;
}
