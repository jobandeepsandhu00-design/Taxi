/**
 * Startbestand für die mündliche Prüfung. Alle Einträge sind „ungeprüft“ (verified=false)
 * und müssen im Admin-Bereich gegen den aktuellen Prüfungsstoff abgeglichen werden.
 */
export type OralSeed = {
  key: string;
  categorySlug: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  questionDe: string;
  modelAnswerDe: string;
  keyPoints: { id: string; text: string; required: boolean }[];
  legalReference?: string;
  followUps: { trigger_point_id: string; question_de: string }[];
};

export const oralQuestions: OralSeed[] = [
  {
    key: "unfall-verhalten",
    categorySlug: "verkehrsrecht",
    difficulty: "MEDIUM",
    questionDe: "Wie verhalten Sie sich, wenn Sie an einem Verkehrsunfall mit Personenschaden beteiligt sind?",
    modelAnswerDe:
      "Sofort anhalten und die Unfallstelle absichern (Warnblinkanlage, Warnweste, Pannendreieck). Erste Hilfe leisten und die Rettung verständigen. Bei Personenschaden muss sofort die nächste Polizeidienststelle verständigt werden. An der Mitwirkung zur Feststellung des Sachverhalts mitwirken und am Unfallort bleiben.",
    keyPoints: [
      { id: "k1", text: "Sofort anhalten und Unfallstelle absichern", required: true },
      { id: "k2", text: "Erste Hilfe leisten / Rettung rufen", required: true },
      { id: "k3", text: "Polizei sofort verständigen (Personenschaden)", required: true },
      { id: "k4", text: "Am Unfallort bleiben und am Sachverhalt mitwirken", required: false },
    ],
    legalReference: "§ 4 StVO",
    followUps: [{ trigger_point_id: "k3", question_de: "Wen müssen Sie bei einem Unfall mit Verletzten zusätzlich zur Rettung verständigen?" }],
  },
  {
    key: "rettungsgasse",
    categorySlug: "stvo",
    difficulty: "EASY",
    questionDe: "Wann und wie bilden Sie eine Rettungsgasse?",
    modelAnswerDe:
      "Auf Autobahnen und Schnellstraßen mit mindestens zwei Fahrstreifen pro Richtung, sobald der Verkehr stockt – nicht erst, wenn ein Einsatzfahrzeug kommt. Fahrzeuge auf dem linken Fahrstreifen weichen nach links aus, alle anderen nach rechts. Der Pannenstreifen bleibt frei bzw. darf mitbenutzt werden.",
    keyPoints: [
      { id: "k1", text: "Autobahn/Schnellstraße, sobald der Verkehr stockt", required: true },
      { id: "k2", text: "Linker Fahrstreifen weicht nach links aus", required: true },
      { id: "k3", text: "Alle anderen Fahrstreifen weichen nach rechts aus", required: true },
    ],
    legalReference: "§ 46 Abs. 6 StVO",
    followUps: [{ trigger_point_id: "k2", question_de: "In welche Richtung weicht das Fahrzeug auf dem ganz linken Fahrstreifen aus?" }],
  },
  {
    key: "konzession-voraussetzungen",
    categorySlug: "gewerberecht",
    difficulty: "MEDIUM",
    questionDe: "Welche Voraussetzungen brauchen Sie, um eine Taxikonzession zu erhalten?",
    modelAnswerDe:
      "Man braucht die allgemeinen gewerberechtlichen Voraussetzungen, die Zuverlässigkeit, die finanzielle Leistungsfähigkeit und die fachliche Eignung, die durch die Konzessionsprüfung nachgewiesen wird. Außerdem ist ein Standort bzw. eine Betriebsstätte in der Gemeinde nötig.",
    keyPoints: [
      { id: "k1", text: "Zuverlässigkeit", required: true },
      { id: "k2", text: "Finanzielle Leistungsfähigkeit", required: true },
      { id: "k3", text: "Fachliche Eignung (Konzessionsprüfung)", required: true },
      { id: "k4", text: "Allgemeine gewerberechtliche Voraussetzungen / Standort", required: false },
    ],
    legalReference: "§ 5 GelverkG",
    followUps: [{ trigger_point_id: "k3", question_de: "Wie weisen Sie Ihre fachliche Eignung nach?" }],
  },
  {
    key: "taxameter",
    categorySlug: "gewerberecht",
    difficulty: "EASY",
    questionDe: "Was gilt für den Taxameter im Wiener Taxi?",
    modelAnswerDe:
      "Der Taxameter muss geeicht sein und bei jeder Fahrt im Pflichtfahrgebiet eingeschaltet werden. Abgerechnet wird nach dem verordneten Tarif. Der Fahrpreis muss für den Fahrgast gut sichtbar angezeigt werden und er erhält auf Wunsch bzw. verpflichtend einen Beleg.",
    keyPoints: [
      { id: "k1", text: "Taxameter muss geeicht sein", required: true },
      { id: "k2", text: "Bei jeder Fahrt einschalten, Abrechnung nach Tarif", required: true },
      { id: "k3", text: "Fahrpreis gut sichtbar, Beleg für Fahrgast", required: false },
    ],
    legalReference: "Wiener Taxitarif / Eichpflicht",
    followUps: [{ trigger_point_id: "k1", question_de: "Welche Voraussetzung muss der Taxameter technisch-rechtlich erfüllen?" }],
  },
  {
    key: "fundsachen",
    categorySlug: "berufskunde",
    difficulty: "EASY",
    questionDe: "Ein Fahrgast hat sein Handy im Taxi vergessen. Was tun Sie?",
    modelAnswerDe:
      "Ich versuche, den Fahrgast zu erreichen, etwa über die Funkzentrale oder die Buchung. Gelingt das nicht, gebe ich den Gegenstand ohne Verzögerung beim Fundamt bzw. Fundservice oder der Polizei ab. Ich behalte den Fund nicht und öffne bzw. benutze ihn nicht.",
    keyPoints: [
      { id: "k1", text: "Fahrgast über Zentrale/Buchung zu erreichen versuchen", required: false },
      { id: "k2", text: "Unverzüglich beim Fundamt/Fundservice oder der Polizei abgeben", required: true },
      { id: "k3", text: "Gegenstand nicht behalten oder benutzen", required: true },
    ],
    followUps: [{ trigger_point_id: "k2", question_de: "Wo geben Sie den Gegenstand ab, wenn Sie den Fahrgast nicht erreichen?" }],
  },
  {
    key: "assistenzhund",
    categorySlug: "berufskunde",
    difficulty: "EASY",
    questionDe: "Darf ein Fahrgast mit einem Assistenzhund abgelehnt werden?",
    modelAnswerDe:
      "Nein. Assistenzhunde, zum Beispiel Blindenführhunde, müssen mitgenommen werden. Eine Ablehnung wäre eine Diskriminierung. Für den Hund darf kein Zuschlag verlangt werden.",
    keyPoints: [
      { id: "k1", text: "Nein, Assistenzhunde müssen mitgenommen werden", required: true },
      { id: "k2", text: "Ablehnung wäre Diskriminierung", required: false },
      { id: "k3", text: "Kein Zuschlag für den Assistenzhund", required: true },
    ],
    followUps: [{ trigger_point_id: "k3", question_de: "Dürfen Sie für den Assistenzhund einen Zuschlag verrechnen?" }],
  },
  {
    key: "registrierkasse",
    categorySlug: "steuerrecht",
    difficulty: "MEDIUM",
    questionDe: "Was bedeutet die Belegerteilungspflicht für Sie als Taxiunternehmer?",
    modelAnswerDe:
      "Für jede Barzahlung – dazu zählen auch Karte und Bankomat – muss dem Fahrgast ein Beleg ausgestellt werden. Der Beleg muss bestimmte Mindestangaben enthalten, etwa Datum, Betrag und Leistung. Der Fahrgast muss den Beleg mitnehmen. Ab den gesetzlichen Umsatzgrenzen ist eine Registrierkasse Pflicht.",
    keyPoints: [
      { id: "k1", text: "Bei jeder Barzahlung (inkl. Karte) einen Beleg ausstellen", required: true },
      { id: "k2", text: "Beleg mit Mindestangaben (Datum, Betrag, Leistung)", required: false },
      { id: "k3", text: "Registrierkassenpflicht ab den Umsatzgrenzen", required: true },
    ],
    legalReference: "§ 131a, § 132a BAO",
    followUps: [{ trigger_point_id: "k3", question_de: "Wann brauchen Sie zusätzlich eine Registrierkasse?" }],
  },
  {
    key: "arbeitszeit",
    categorySlug: "arbeitsrecht",
    difficulty: "MEDIUM",
    questionDe: "Was müssen angestellte Taxilenker bei Arbeitszeit und Ruhezeit beachten?",
    modelAnswerDe:
      "Es gelten die gesetzlichen Höchstgrenzen der Arbeitszeit und die Mindestruhezeiten: nach der täglichen Arbeitszeit ist eine ununterbrochene Ruhezeit einzuhalten und es stehen Ruhepausen zu. Die Arbeitszeiten müssen aufgezeichnet werden. Übermüdet zu fahren ist auch aus Sicherheitsgründen verboten.",
    keyPoints: [
      { id: "k1", text: "Höchstarbeitszeit einhalten", required: true },
      { id: "k2", text: "Tägliche Ruhezeit und Ruhepausen einhalten", required: true },
      { id: "k3", text: "Arbeitszeiten aufzeichnen", required: false },
    ],
    legalReference: "AZG / ARG",
    followUps: [{ trigger_point_id: "k2", question_de: "Was steht Ihnen zwischen zwei Arbeitstagen und während der Arbeit zu?" }],
  },
  {
    key: "winterreifen",
    categorySlug: "fahrzeugkunde",
    difficulty: "EASY",
    questionDe: "Wann brauchen Sie Winterreifen und welche Mindestprofiltiefe gilt dafür?",
    modelAnswerDe:
      "Es gilt die situative Winterreifenpflicht von 1. November bis 15. April: bei winterlichen Fahrbahnverhältnissen wie Schnee, Schneematsch oder Eis müssen Winterreifen montiert sein. Winterreifen müssen bei Radialreifen mindestens 4 mm Profiltiefe haben.",
    keyPoints: [
      { id: "k1", text: "Situativ von 1. November bis 15. April", required: true },
      { id: "k2", text: "Bei Schnee, Schneematsch oder Eis", required: true },
      { id: "k3", text: "Mindestens 4 mm Profiltiefe", required: true },
    ],
    legalReference: "§ 102 Abs. 8a KFG",
    followUps: [{ trigger_point_id: "k3", question_de: "Wie tief muss das Profil eines Winterreifens mindestens sein?" }],
  },
  {
    key: "deeskalation",
    categorySlug: "kundenbetreuung",
    difficulty: "MEDIUM",
    questionDe: "Ein Fahrgast wird während der Fahrt aggressiv. Wie reagieren Sie?",
    modelAnswerDe:
      "Ruhig und sachlich bleiben, nicht provozieren lassen und die Situation deeskalieren. Wenn möglich an einem sicheren, belebten Ort anhalten. Bei Gefahr den Notruf der Polizei (133) wählen oder die Funkzentrale bzw. den Notfallknopf nutzen. Die eigene Sicherheit geht vor.",
    keyPoints: [
      { id: "k1", text: "Ruhig bleiben, deeskalieren, nicht provozieren", required: true },
      { id: "k2", text: "An einem sicheren Ort anhalten", required: false },
      { id: "k3", text: "Bei Gefahr Polizei (133) bzw. Zentrale/Notfallknopf", required: true },
      { id: "k4", text: "Eigene Sicherheit geht vor", required: false },
    ],
    followUps: [{ trigger_point_id: "k3", question_de: "Welche Nummer wählen Sie, wenn die Situation gefährlich wird?" }],
  },
];
