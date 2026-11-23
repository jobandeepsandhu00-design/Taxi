import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { addDays, dayKey, dayKeyToDate } from "@/lib/dates";
import { DISTRICT_NAMES, PLACES, type Place } from "@/lib/ortskunde";
import { daySeed, pickRotation, seededShuffle, type StoryQuiz, type StorySlideData } from "@/lib/stories";
import { publishedWhere, publicQuestionSelect } from "@/server/questions";
import { objectPublicUrl } from "@/server/storage";

/**
 * Tägliche Content-Engine: wählt einmal pro Tag die Slides für Tipp, Wien-Ort, Regel und Zahl.
 * Idempotent – vom Cron (05:00 Wien) aufgerufen und zur Sicherheit beim ersten Laden des Tages.
 * Ergebnis wird in story_daily gespeichert, damit alle dieselben Inhalte sehen.
 */

const NO_REPEAT_DAYS = 30;

type DbSlide = Prisma.StorySlideGetPayload<object>;

export function slideFromDb(s: DbSlide): StorySlideData {
  const cta = s.cta as { label?: string; route?: string } | null;
  const map = s.map as { lat?: number; lng?: number; label?: string } | null;
  return {
    id: s.id,
    title: s.titleDe,
    body: s.bodyDe,
    durationMs: s.durationMs,
    imageUrl: s.imagePath ? (s.imagePath.startsWith("http") ? s.imagePath : objectPublicUrl("stories", s.imagePath)) : null,
    videoUrl: s.videoPath ? (s.videoPath.startsWith("http") ? s.videoPath : objectPublicUrl("stories", s.videoPath)) : null,
    bg: s.bgColor,
    emoji: s.emoji,
    cta: cta?.label && cta.route ? { label: cta.label, route: cta.route } : null,
    map: map && typeof map.lat === "number" && typeof map.lng === "number" ? { lat: map.lat, lng: map.lng, label: map.label ?? "" } : null,
    credit: s.imageCredit,
  };
}

/** DB-Slides inkl. verknüpfter Quizfrage ({ question_id }) auflösen. */
export async function resolveDbSlides(rows: DbSlide[]): Promise<StorySlideData[]> {
  return Promise.all(
    rows.map(async (r) => {
      const base = slideFromDb(r);
      const qid = (r.quiz as { question_id?: string } | null)?.question_id;
      if (qid) base.quiz = await quizFromQuestion(qid);
      return base;
    }),
  );
}

export async function quizFromQuestion(id: string): Promise<StoryQuiz | null> {
  const q = await prisma.question.findFirst({ where: { id, ...publishedWhere }, select: publicQuestionSelect });
  if (!q || q.options.length < 2) return null;
  return { questionId: q.id, question: q.text, options: q.options.map((o) => ({ id: o.id, text: o.text })), multiple: q.multipleCorrect };
}

async function recentSources(groupKey: string, today: string): Promise<string[]> {
  const rows = await prisma.storyDaily.findMany({
    where: { groupKey, day: { gte: dayKeyToDate(addDays(today, -NO_REPEAT_DAYS)), lt: dayKeyToDate(today) } },
    orderBy: { day: "desc" },
    select: { sourceIds: true },
  });
  return rows.flatMap((r) => r.sourceIds);
}

/* ── Gruppen ─────────────────────────────────────────────── */

async function buildTipp(groupId: string, today: string): Promise<{ slides: StorySlideData[]; sources: string[] } | null> {
  const pool = await prisma.storySlide.findMany({ where: { groupId }, orderBy: { sort: "asc" } });
  if (!pool.length) return null;
  const pick = pickRotation(pool.map((p) => p.id), await recentSources("tipp", today), 3, daySeed(today));
  const byId = new Map(pool.map((p) => [p.id, p]));
  return { slides: await resolveDbSlides(pick.map((id) => byId.get(id)!)), sources: pick };
}

const PLACE_EMOJI: Record<Place["type"], string> = { Bahnhof: "🚉", Spital: "🏥", Sehenswürdigkeit: "🏛️", Platz: "📍", "Sport & Freizeit": "🎡" };
const PLACE_TIP: Record<Place["type"], string> = {
  Bahnhof: "Viele Fahrgäste mit Gepäck. Merk dir, wo die Taxistandplätze sind und wie du am schnellsten zu- und abfährst.",
  Spital: "Fahrgäste sind oft eingeschränkt mobil. Kenne die Haupteinfahrt und die Zufahrt zur Notaufnahme.",
  Sehenswürdigkeit: "Hier steigen oft Tourist:innen ein. Kenne die Umgebung, die nächsten Standplätze und typische Ziele.",
  Platz: "Ein wichtiger Orientierungspunkt – wird oft als Treffpunkt genannt. Kenne die Zufahrten.",
  "Sport & Freizeit": "Bei Veranstaltungen gibt es viel Andrang, Sperren und Umleitungen – plane Ausweichrouten.",
};

async function buildOrt(today: string): Promise<{ slides: StorySlideData[]; sources: string[]; placeName: string } | null> {
  const [key] = pickRotation(PLACES.map((p) => p.key), await recentSources("ort", today), 1, daySeed(today) + 7);
  const place = PLACES.find((p) => p.key === key);
  if (!place) return null;
  const district = DISTRICT_NAMES[place.district] ?? "";
  const [lng, lat] = place.coord;
  const base = `ort:${today}:${place.key}`;
  // passende Prüfungsfrage zum Ort (falls vorhanden) – zählt als echter Versuch
  // nur ein eindeutiges Wort verwenden (z. B. „Praterstern“, „Stephansdom“) – keine Allerweltswörter wie „Wiener“
  const STOP = new Set(["wiener", "wien", "bahnhof", "theater", "haus", "oberes", "unteres", "platz", "der", "des", "in", "am"]);
  const core = place.name.replace(/\(.*?\)/g, " ").split(/[\s-]+/).filter((w) => w.length >= 6 && !STOP.has(w.toLowerCase())).sort((a, b) => b.length - a.length)[0];
  const linked = core ? await prisma.question.findFirst({ where: { ...publishedWhere, text: { contains: core, mode: "insensitive" } }, select: { id: true } }) : null;
  let quiz: StoryQuiz | null = linked ? await quizFromQuestion(linked.id) : null;
  if (!quiz) {
    // eigene Übungsfrage: In welchem Bezirk liegt …? (sofortiges Feedback, ohne Leitner)
    const others = seededShuffle(Object.keys(DISTRICT_NAMES).map(Number).filter((n) => n !== place.district), daySeed(today)).slice(0, 3);
    const opts = seededShuffle([place.district, ...others], daySeed(today) + 3).map((n) => ({ id: `d${n}`, text: `${n}. ${DISTRICT_NAMES[n]}` }));
    quiz = { questionId: `local:${place.key}`, question: `In welchem Bezirk liegt „${place.name}“?`, options: opts, multiple: false, correctId: `d${place.district}` };
  }
  return {
    placeName: place.name,
    sources: [place.key],
    slides: [
      { id: `${base}:1`, title: place.name, body: `${place.district}. Bezirk – ${district}. ${place.type}.`, durationMs: 6000, emoji: PLACE_EMOJI[place.type], bg: "linear-gradient(160deg,#0f172a,#1e3a8a)", big: `${place.district}.`, map: { lat, lng, label: place.name } },
      { id: `${base}:2`, title: "Taxi-Info", body: PLACE_TIP[place.type], durationMs: 7000, emoji: "🚕", bg: "linear-gradient(160deg,#111,#3f3f46)", map: { lat, lng, label: place.name }, cta: { label: "Ortskunde üben", route: "/ortskunde" } },
      { id: `${base}:3`, title: "Kurz-Check", body: "Tippe auf die richtige Antwort.", durationMs: 12000, emoji: "❓", bg: "linear-gradient(160deg,#1e3a8a,#2563eb)", quiz },
    ],
  };
}

async function buildRegel(today: string): Promise<{ slides: StorySlideData[]; sources: string[] } | null> {
  const recent = await recentSources("regel", today);
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT q.id FROM "Question" q JOIN "Category" c ON c.id = q."categoryId"
    WHERE q.status = 'PUBLISHED' AND c."isActive" = true AND q."sourceDetail" IS NOT NULL AND length(coalesce(q.explanation, '')) > 40
      AND NOT (q.id = ANY(${recent}::text[]))
    ORDER BY md5(q.id || ${today}) LIMIT 1`;
  const id = rows[0]?.id;
  if (!id) return null;
  const q = await prisma.question.findUnique({ where: { id }, select: { sourceDetail: true, explanation: true, text: true } });
  if (!q) return null;
  const quiz = await quizFromQuestion(id);
  const body = (q.explanation ?? "").replace(/\s+/g, " ").trim();
  const slides: StorySlideData[] = [
    { id: `regel:${today}:${id}:1`, title: "Regel des Tages", credit: q.sourceDetail ? `Quelle: ${q.sourceDetail}`.slice(0, 200) : null, body: body.length > 320 ? `${body.slice(0, 317)}…` : body, durationMs: 9000, emoji: "§", big: "§", bg: "linear-gradient(160deg,#111827,#7c2d12)", cta: { label: "Frage ansehen", route: `/fragen/${id}` } },
  ];
  if (quiz) slides.push({ id: `regel:${today}:${id}:2`, title: "Weißt du's?", body: "Zählt als echte Antwort für deine Wiederholung.", durationMs: 15000, emoji: "🧠", bg: "linear-gradient(160deg,#7c2d12,#ea580c)", quiz });
  return { slides, sources: [id] };
}

async function buildZahl(today: string): Promise<{ slides: StorySlideData[]; sources: string[] } | null> {
  const facts = await prisma.numberFact.findMany({ select: { id: true, category: true, statement: true, value: true, unit: true, legalReference: true, verified: true } });
  if (!facts.length) return null;
  const preferred = facts.filter((f) => f.verified).length >= 4 ? facts.filter((f) => f.verified) : facts;
  const pick = pickRotation(preferred.map((f) => f.id), await recentSources("zahl", today), 2, daySeed(today) + 11);
  const byId = new Map(facts.map((f) => [f.id, f]));
  const slides = pick.map((id, i) => {
    const f = byId.get(id)!;
    return { id: `zahl:${today}:${id}`, title: f.category, body: f.statement + (f.legalReference ? ` (${f.legalReference})` : ""), durationMs: 7000, big: `${f.value}${f.unit ? ` ${f.unit}` : ""}`, bg: i % 2 ? "linear-gradient(160deg,#064e3b,#059669)" : "linear-gradient(160deg,#111,#854d0e)", cta: { label: "Zahlen-Trainer", route: "/zahlen" } } satisfies StorySlideData;
  });
  return { slides, sources: pick };
}

/** Legt die Tagesauswahl an (falls noch nicht vorhanden). Gibt die Anzahl neu angelegter Gruppen zurück. */
export async function ensureDaily(day = dayKey()): Promise<{ created: string[]; placeName?: string }> {
  const groups = await prisma.storyGroup.findMany({ where: { type: { in: ["tipp", "ort", "regel", "zahl"] } }, select: { id: true, key: true, type: true } });
  const existing = new Set((await prisma.storyDaily.findMany({ where: { day: dayKeyToDate(day) }, select: { groupKey: true } })).map((r) => r.groupKey));
  const created: string[] = [];
  let placeName: string | undefined;
  for (const g of groups) {
    if (existing.has(g.key)) continue;
    let res: { slides: StorySlideData[]; sources: string[]; placeName?: string } | null = null;
    try {
      if (g.type === "tipp") res = await buildTipp(g.id, day);
      else if (g.type === "ort") res = await buildOrt(day);
      else if (g.type === "regel") res = await buildRegel(day);
      else if (g.type === "zahl") res = await buildZahl(day);
    } catch (e) {
      console.warn("stories: build", g.key, e instanceof Error ? e.message : e);
    }
    // Rückfall: gespeicherte Slides der Gruppe
    if (!res || res.slides.length === 0) {
      const own = await prisma.storySlide.findMany({ where: { groupId: g.id }, orderBy: { sort: "asc" }, take: 5 });
      res = { slides: await resolveDbSlides(own), sources: own.map((s) => s.id) };
    }
    if (!res.slides.length) continue;
    try {
      await prisma.storyDaily.create({ data: { day: dayKeyToDate(day), groupKey: g.key, slides: res.slides as unknown as Prisma.InputJsonValue, sourceIds: res.sources } });
      created.push(g.key);
      if (g.type === "ort" && res.placeName) placeName = res.placeName;
    } catch {
      /* gleichzeitig angelegt – egal */
    }
  }
  return { created, placeName };
}
