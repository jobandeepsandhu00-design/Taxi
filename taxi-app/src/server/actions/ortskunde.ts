"use server";

import { z } from "zod";
import districts from "@/data/wien-bezirke.json";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { isNightOwl } from "@/lib/gamification";
import { checkRoute, distanceM, PLACE_TOLERANCE_M, PLACES, pointInGeometry, ROUTES, scoreForDistance, type DistrictGeometry } from "@/lib/ortskunde";
import { rewardXp, type Reward } from "@/server/gamification";

const features = (districts as unknown as { features: { properties: { no: number }; geometry: DistrictGeometry }[] }).features;
const coordSchema = z.object({ lon: z.number().min(15.5).max(17.5), lat: z.number().min(47.5).max(48.8) });

function districtAt(pt: [number, number]): number | null {
  return features.find((f) => pointInGeometry(pt, f.geometry))?.properties.no ?? null;
}

export interface GuessResult {
  correct: boolean;
  distance: number | null;
  score: number;
  target: [number, number] | null;
  tappedDistrict: number | null;
  reward: Reward | null;
}

/** „Wo liegt …?“ – Ort: Tipp auf der Karte, Bewertung nach Entfernung. */
export async function submitPlaceGuessAction(input: { key: string; lon: number; lat: number }): Promise<GuessResult> {
  const user = await requireUser();
  const c = coordSchema.parse({ lon: input.lon, lat: input.lat });
  const place = PLACES.find((p) => p.key === input.key);
  if (!place) throw new Error("Unbekannter Ort.");
  const pt: [number, number] = [c.lon, c.lat];
  const distance = distanceM(pt, place.coord);
  const correct = distance <= PLACE_TOLERANCE_M;
  await prisma.ortskundeAttempt.create({ data: { userId: user.id, kind: "place", placeKey: place.key, district: place.district, correct, distanceM: distance } });
  const reward = correct ? await rewardXp(user.id, 10, isNightOwl() ? ["nachteule"] : []) : null;
  return { correct, distance, score: scoreForDistance(distance), target: place.coord, tappedDistrict: districtAt(pt), reward };
}

/** „Wo liegt der Bezirk …?“ – Tipp muss im richtigen Bezirk liegen. */
export async function submitDistrictGuessAction(input: { no: number; lon: number; lat: number }): Promise<GuessResult> {
  const user = await requireUser();
  const c = coordSchema.parse({ lon: input.lon, lat: input.lat });
  const no = z.number().int().min(1).max(23).parse(input.no);
  const tapped = districtAt([c.lon, c.lat]);
  const correct = tapped === no;
  await prisma.ortskundeAttempt.create({ data: { userId: user.id, kind: "district", placeKey: `bezirk-${no}`, district: no, correct } });
  const reward = correct ? await rewardXp(user.id, 10) : null;
  return { correct, distance: null, score: correct ? 100 : 0, target: null, tappedDistrict: tapped, reward };
}

/** Routen-Trainer: Reihenfolge der Straßenabschnitte prüfen. */
export async function submitRouteAction(input: { id: string; order: string[] }): Promise<{ correct: boolean; firstWrong: number; solution: string[]; reward: Reward | null }> {
  const user = await requireUser();
  const task = ROUTES.find((r) => r.id === input.id);
  if (!task) throw new Error("Unbekannte Route.");
  const order = z.array(z.string().max(60)).max(12).parse(input.order);
  const res = checkRoute(task, order);
  const reward = res.correct ? await rewardXp(user.id, 15) : null;
  return { ...res, solution: task.segments.map((s) => s.name), reward };
}

/** Beherrschung je Bezirk (letzte 5 Versuche) für die Heatmap. */
export async function getDistrictMasteryAction(): Promise<Record<number, number>> {
  const user = await requireUser();
  const rows = await prisma.ortskundeAttempt.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" }, select: { district: true, correct: true } });
  const by = new Map<number, boolean[]>();
  for (const r of rows) by.set(r.district, [...(by.get(r.district) ?? []), r.correct]);
  const out: Record<number, number> = {};
  for (const [d, list] of by) {
    const last = list.slice(-5);
    out[d] = Math.round((last.filter(Boolean).length / 5) * 100);
  }
  return out;
}
