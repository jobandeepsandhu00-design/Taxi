/**
 * Textbausteine des Smart Coach (Toni) – 3–5 Varianten pro Regel, mit {Platzhaltern}.
 * Die Auswahl rotiert täglich (siehe pickVariant), dadurch wiederholt sich eine Variante
 * frühestens nach 3 Tagen.
 */
export type Variant = { title: string; text: string };

export const TEMPLATES: Record<string, Variant[]> = {
  exam_today: [
    { title: "Heute ist Prüfungstag! 🍀", text: "Du hast dich gut vorbereitet. Ausweis eingepackt? Atme tief durch, lies jede Frage bis zum Ende – du schaffst das!" },
    { title: "Toi, toi, toi! 🚕", text: "Heute zählt’s. Kein neuer Stoff mehr – nur kurz die Spickzettel anschauen und dann ruhig hingehen." },
    { title: "Dein großer Tag", text: "Pünktlich losfahren, Unterlagen mitnehmen, ruhig bleiben. Ich drück dir alle Daumen!" },
  ],
  exam_tomorrow: [
    { title: "Morgen ist Prüfung – deine Checkliste", text: "Lichtbildausweis, Einladung, Kugelschreiber und (falls erlaubt) Taschenrechner bereitlegen. Heute nur noch wiederholen, nichts Neues – und früh schlafen." },
    { title: "Letzter Tag vor der Prüfung", text: "Pack heute schon alles ein: Ausweis, Einladung, Stift. Wiederhole kurz die wichtigen Zahlen und geh früh ins Bett." },
    { title: "Countdown: 1 Tag", text: "Heute zählt Ruhe statt Pauken. Checkliste: Ausweis, Einladung, Stift bereitlegen, Spickzettel durchgehen, Wecker stellen – fertig!" },
  ],
  exam_soon_low: [
    { title: "Noch {days} Tage – jetzt Gas geben", text: "Deine Prüfungsreife liegt bei {readiness}. Mit {lessons} Lektionen pro Tag schaffst du die {open} offenen Fragen rechtzeitig." },
    { title: "Plan für die letzten {days} Tage", text: "Rechnen wir: {open} Fragen sind noch nicht sicher. Das sind {lessons} Mini-Lektionen à 5 Fragen pro Tag – machbar!" },
    { title: "Endspurt mit System", text: "Prüfungsreife {readiness} – da geht noch was. {lessons} Lektionen täglich bringen dich bis zur Prüfung in {days} Tagen ins Ziel." },
    { title: "Jeder Tag zählt", text: "In {days} Tagen ist Prüfung. Wenn du täglich {lessons} Lektionen machst, sind alle {open} offenen Fragen geschafft." },
  ],
  due_reviews: [
    { title: "{n} Fragen sind fällig", text: "{n} Fragen sind fällig – {min} Minuten reichen. Jetzt wiederholen, dann sitzen sie." },
    { title: "Kurz wiederholen?", text: "Dein Karteikasten wartet: {n} fällige Fragen, ca. {min} Minuten. Genau jetzt ist der beste Zeitpunkt." },
    { title: "Wiederholung ruft", text: "{n} Fragen wollen wieder abgefragt werden. In {min} Minuten bist du durch – gemma!" },
    { title: "{min} Minuten für dein Gedächtnis", text: "Heute sind {n} Wiederholungen fällig. Wer jetzt wiederholt, vergisst viel weniger." },
  ],
  streak_risk: [
    { title: "Deine Serie wackelt 🔥", text: "Du hast heute noch nichts gelernt – deine {streak}-Tage-Serie endet um Mitternacht. 5 Minuten reichen!" },
    { title: "Rette deine {streak} Tage", text: "Eine Mini-Lektion mit 5 Fragen und deine Serie lebt weiter." },
    { title: "Noch schnell was lernen?", text: "{streak} Tage am Stück – das wäre schade. Ein kurzer Abschnitt im Lernbuch zählt auch." },
  ],
  streak_celebrate: [
    { title: "{streak} Tage am Stück! 🎉", text: "Wahnsinn – {streak} Tage hintereinander gelernt. So wird Wissen zur Gewohnheit." },
    { title: "Serien-Profi!", text: "{streak} Tage ohne Pause. Dein Gedächtnis sagt danke!" },
    { title: "Stark: {streak} Tage", text: "Regelmäßigkeit schlägt Marathon-Lernen – und du bist der Beweis. Weiter so!" },
    { title: "🔥 {streak} Tage", text: "Deine Serie brennt! Halte das Tempo, dann bist du bald prüfungsbereit." },
  ],
  first_steps: [
    { title: "Willkommen! Fangen wir an 🚕", text: "Am besten startest du im Lernbuch: Lies das erste Kapitel Abschnitt für Abschnitt – danach übst du die Fragen." },
    { title: "Servus! Ich bin Toni", text: "Ich helfe dir, Schritt für Schritt prüfungsbereit zu werden. Erster Schritt: Kapitel 1 im Lernbuch lesen." },
    { title: "Los geht’s", text: "Erst lesen, dann üben – so lernst du am leichtesten. Öffne das Lernbuch und starte mit dem ersten Abschnitt." },
  ],
  inactive_comeback: [
    { title: "Schön, dass du wieder da bist!", text: "{days} Tage Pause sind kein Problem. Starte locker mit ein paar fälligen Fragen – das Wissen kommt schnell zurück." },
    { title: "Willkommen zurück 👋", text: "Nach {days} Tagen Pause fangen wir sanft an: eine Mini-Lektion, 3 Minuten." },
    { title: "Weiter geht’s – ganz entspannt", text: "Du warst {days} Tage weg. Kein schlechtes Gewissen: Heute zählt nur, dass du wieder anfängst." },
  ],
  late_night: [
    { title: "Schon spät 🌙", text: "Kurze Session, dann schlafen – Schlaf hilft beim Merken." },
    { title: "Nachteule?", text: "Ein paar Fragen sind super, aber dann ab ins Bett: Im Schlaf festigt sich, was du gelernt hast." },
    { title: "Gute-Nacht-Runde", text: "Wiederhole noch kurz 5 Fragen und dann schlafen – morgen sitzt es besser." },
  ],
  readiness_drop: [
    { title: "Deine Prüfungsreife sinkt", text: "Sie ist von {before} auf {now} gefallen. Ein paar Wiederholungen bringen dich schnell wieder nach oben." },
    { title: "Kleiner Rückschritt", text: "Prüfungsreife {now} statt {before} – meistens heißt das: Wiederholungen sind liegen geblieben." },
    { title: "Zeit zum Auffrischen", text: "Deine Prüfungsreife ist um {diff} Punkte gesunken. Fällige Fragen zuerst, dann geht’s wieder bergauf." },
  ],
  weak_category: [
    { title: "Schwachstelle: {category}", text: "In „{category}“ liegst du bei {acc} % richtig. 10 gezielte Fragen helfen hier am meisten." },
    { title: "Hier lohnt sich Üben", text: "„{category}“ ist gerade dein schwächstes Kapitel ({acc} %). Lies die Antworten nochmal im Lernbuch und übe dann." },
    { title: "{category} braucht dich", text: "{acc} % richtig in „{category}“ – mit ein paar Runden Training wird das schnell besser." },
    { title: "Fokus: {category}", text: "Deine Trefferquote in „{category}“: {acc} %. Konzentrier dich heute auf dieses Kapitel." },
  ],
  kapitel_check_ready: [
    { title: "Bereit für den Kapitel-Check", text: "Du hast „{chapter}“ komplett gelesen. Mach jetzt den Check – ab 80 % ist das Kapitel fürs Quiz freigeschaltet." },
    { title: "„{chapter}“ gelesen ✅", text: "Zeit für den Kapitel-Check: 5 Fragen, dann weißt du, ob es sitzt." },
    { title: "Check gefällig?", text: "Alle Karten in „{chapter}“ gelesen – zeig im Kapitel-Check, was du kannst." },
  ],
  lernbuch_next: [
    { title: "Lies zuerst Kapitel „{chapter}“", text: "Lies zuerst Kapitel „{chapter}“ – erst lesen, dann üben. Ein Abschnitt hat nur 10 Fragen." },
    { title: "Weiter im Lernbuch", text: "Als Nächstes: „{chapter}“. Nimm dir einen Abschnitt vor, das dauert ca. 5 Minuten." },
    { title: "Neues Kapitel wartet", text: "„{chapter}“ hast du noch nicht gelesen. Ein Abschnitt am Tag und du bist bald durch." },
  ],
  lernbuch_again: [
    { title: "{n} Lernbuch-Karten zum Wiederholen", text: "Du hast {n} Karten mit „Nochmal“ markiert. Lies sie jetzt kurz durch." },
    { title: "Nochmal-Karten warten", text: "{n} Karten aus dem Lernbuch sind wieder dran – schnell durchlesen, dann sitzen sie." },
    { title: "Kurze Lese-Wiederholung", text: "{n} Karten wollten nochmal gelesen werden. Das dauert nur ein paar Minuten." },
  ],
  open_mistakes: [
    { title: "{n} Fehler warten", text: "Im Fehlertraining übst du genau die {n} Fragen, die du falsch hattest. Fehler sind Gold wert!" },
    { title: "Fehler ausbügeln", text: "{n} offene Fehler – schnapp sie dir, bevor sie sich festsetzen." },
    { title: "Fehlertraining", text: "Jede der {n} falschen Antworten ist eine Chance. Lies die Erklärung und probier’s nochmal." },
  ],
  accuracy_up: [
    { title: "+{diff} Prozentpunkte! 📈", text: "Diese Woche {now} % richtig statt {before} % – deine Arbeit zahlt sich aus." },
    { title: "Du wirst besser!", text: "Von {before} % auf {now} % in einer Woche. Genau so geht’s weiter." },
    { title: "Starke Woche", text: "Deine Trefferquote ist um {diff} Punkte gestiegen. Respekt!" },
  ],
  accuracy_down: [
    { title: "Etwas holprige Woche", text: "Diese Woche {now} % richtig, letzte Woche {before} %. Lies bei falschen Antworten die Erklärung – das hilft am meisten." },
    { title: "Kurz durchschnaufen", text: "Die Trefferquote ist auf {now} % gesunken. Vielleicht zu viel Neues auf einmal? Wiederhole zuerst." },
    { title: "Nicht aufgeben", text: "{now} % statt {before} % – das passiert. Ein Blick ins Lernbuch vor dem Üben wirkt Wunder." },
  ],
  goal_done: [
    { title: "Tagesziel geschafft! 🎯", text: "{done} Fragen heute – Ziel erreicht. Alles weitere ist Bonus." },
    { title: "Ziel erreicht!", text: "Du hast dein Tagesziel von {goal} Fragen geschafft. Gönn dir eine Pause!" },
    { title: "Erledigt für heute", text: "{done} von {goal} Fragen – stark! Morgen geht’s weiter." },
  ],
  goal_progress: [
    { title: "Noch {left} Fragen bis zum Ziel", text: "Du hast heute {done} von {goal} Fragen geschafft. Ein kurzer Endspurt?" },
    { title: "Fast da!", text: "{left} Fragen fehlen noch zum Tagesziel. Das ist eine Mini-Lektion." },
    { title: "Weiter so", text: "{done} Fragen heute – nur noch {left}, dann ist das Tagesziel erreicht." },
  ],
  morning: [
    { title: "Guten Morgen! ☀️", text: "Ein paar Fragen zum Frühstück? Morgens merkt man sich besonders viel." },
    { title: "Servus und guten Morgen", text: "Starte den Tag mit einer Mini-Lektion – 3 Minuten, dann bist du dabei." },
    { title: "Frischer Kopf, frisches Wissen", text: "Der Morgen ist perfekt für ein Kapitel im Lernbuch. Los geht’s!" },
  ],
  readiness_high: [
    { title: "Prüfungsreife {readiness} – stark!", text: "Du bist gut vorbereitet. Teste dich jetzt unter Echtbedingungen in der Prüfungssimulation." },
    { title: "Fast prüfungsbereit", text: "Mit {readiness} Punkten bist du richtig gut. Eine Prüfungssimulation zeigt dir, wo noch Lücken sind." },
    { title: "Zeit für den Ernstfall", text: "Prüfungsreife {readiness}! Mach eine komplette Simulation mit Zeitlimit." },
  ],
  no_exam_date: [
    { title: "Wann ist deine Prüfung?", text: "Trag dein Prüfungsdatum im Profil ein – dann plane ich, wie viel du pro Tag lernen solltest." },
    { title: "Ein Ziel hilft", text: "Mit einem Prüfungstermin kann ich dir sagen, wie viele Lektionen pro Tag reichen. Trag ihn im Profil ein." },
    { title: "Termin eintragen?", text: "Sobald ich dein Prüfungsdatum kenne, bekommst du einen Countdown und einen passenden Plan." },
  ],
  exam_past: [
    { title: "Wie ist die Prüfung gelaufen?", text: "Dein eingetragenes Prüfungsdatum ist vorbei. Hast du einen neuen Termin? Trag ihn im Profil ein." },
    { title: "Neuer Termin?", text: "Das Prüfungsdatum liegt in der Vergangenheit. Aktualisiere es, damit dein Plan wieder stimmt." },
    { title: "Datum aktualisieren", text: "Dein Prüfungstermin ist vorbei – trag einen neuen ein oder lösche ihn im Profil." },
  ],
  untouched_category: [
    { title: "Noch unberührt: {category}", text: "In „{category}“ hast du in letzter Zeit keine Frage geübt. Schau mal rein!" },
    { title: "Vergessenes Kapitel?", text: "„{category}“ kommt auch in der Prüfung vor – du hast es länger nicht geübt." },
    { title: "Abwechslung", text: "Wie wär’s heute mit „{category}“? Dort warst du schon länger nicht." },
  ],
  strong_category: [
    { title: "Profi in {category} 💪", text: "{acc} % richtig in „{category}“ – das sitzt!" },
    { title: "Stärke: {category}", text: "In „{category}“ bist du richtig gut ({acc} %). Darauf kannst du dich verlassen." },
    { title: "Top in {category}", text: "{acc} % Trefferquote – „{category}“ hast du im Griff." },
  ],
  oral_practice: [
    { title: "Mündlich üben", text: "Die Prüfung ist in {days} Tagen. Übe auch, Antworten laut zu formulieren – in der mündlichen Prüfung." },
    { title: "Laut antworten trainieren", text: "Wissen ist das eine, es zu erklären das andere. Probier heute 3 mündliche Fragen." },
    { title: "Sprich’s aus!", text: "In {days} Tagen ist Prüfung – trainiere die mündlichen Fragen, damit du sicher formulierst." },
  ],
  numbers_trainer: [
    { title: "Zahlen festigen", text: "Beträge, Fristen, Abstände: Mit dem Zahlen-Trainer sitzen sie in {days} Tagen sicher." },
    { title: "Wichtige Zahlen", text: "Zahlen sind beliebte Prüfungsfallen. 5 Minuten im Zahlen-Trainer helfen enorm." },
    { title: "Zahlen-Check", text: "Kurz vor der Prüfung lohnt es sich, die wichtigsten Zahlen zu wiederholen." },
  ],
  lernbuch_halfway: [
    { title: "Halbzeit im Lernbuch! 🌓", text: "Du hast {pct} % aller Karten gelesen. Die zweite Hälfte schaffst du auch!" },
    { title: "Mehr als die Hälfte gelesen", text: "{read} von {total} Karten – du bist auf einem richtig guten Weg." },
    { title: "{pct} % gelesen", text: "Über die Hälfte des Lernbuchs ist geschafft. Weiter so!" },
  ],
  lernbuch_done: [
    { title: "Lernbuch komplett gelesen! 📚", text: "Alle Karten gelesen – großartig. Jetzt heißt es üben und wiederholen." },
    { title: "Alles gelesen", text: "Du kennst jetzt den gesamten Stoff. Nutze Quiz, Fehlertraining und Prüfungssimulation." },
    { title: "Lernbuch: 100 %", text: "Respekt! Jetzt festigst du das Wissen mit Übungsfragen." },
  ],
  exam_far: [
    { title: "Noch {days} Tage – ganz entspannt", text: "Du hast genug Zeit. Lerne regelmäßig in kleinen Portionen, dann wird’s stressfrei." },
    { title: "Gleichmäßig bleibt’s leicht", text: "{days} Tage bis zur Prüfung: Ein Abschnitt im Lernbuch pro Tag reicht für einen guten Start." },
    { title: "Langer Atem", text: "Bis zur Prüfung sind es {days} Tage. Kleine tägliche Schritte schlagen jedes Last-Minute-Pauken." },
  ],
  keep_going: [
    { title: "Weiter geht’s!", text: "Mach heute eine Mini-Lektion – 5 Fragen, ca. 3 Minuten." },
    { title: "Bereit für ein paar Fragen?", text: "Jede beantwortete Frage bringt dich näher zur bestandenen Prüfung." },
    { title: "Kleiner Schritt, große Wirkung", text: "Schon 5 Minuten am Tag machen einen Unterschied. Leg los!" },
  ],
};

/** Einfacher, stabiler String-Hash. */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Tagesnummer (Tage seit 1970) aus einem Datums-Schlüssel YYYY-MM-DD. */
export function dayNumber(dayKey: string): number {
  return Math.floor(Date.parse(`${dayKey}T00:00:00Z`) / 86_400_000);
}

/** Variante für heute: rotiert täglich → bei ≥ 3 Varianten keine Wiederholung innerhalb von 3 Tagen. */
export function pickVariant(ruleId: string, dayKey: string, seed = ""): Variant {
  const list = TEMPLATES[ruleId] ?? TEMPLATES.keep_going;
  const idx = (hashString(ruleId + seed) + dayNumber(dayKey)) % list.length;
  return list[idx];
}

/** {platzhalter} ersetzen. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
