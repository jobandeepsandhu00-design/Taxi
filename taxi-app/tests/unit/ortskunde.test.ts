import { describe, expect, it } from "vitest";
import districts from "@/data/wien-bezirke.json";
import { checkRoute, distanceM, districtMastery, PLACES, pointInGeometry, ROUTES, scoreForDistance, type DistrictGeometry } from "@/lib/ortskunde";

const features = (districts as unknown as { features: { properties: { no: number }; geometry: DistrictGeometry }[] }).features;

describe("Ortskunde", () => {
  it("Bezirksdaten enthalten alle 23 Bezirke", () => {
    expect(features.map((f) => f.properties.no)).toEqual(Array.from({ length: 23 }, (_, i) => i + 1));
  });
  it("jeder Ort liegt im angegebenen Bezirk", () => {
    for (const p of PLACES) {
      const f = features.find((x) => x.properties.no === p.district)!;
      expect(pointInGeometry(p.coord, f.geometry), p.name).toBe(true);
    }
  });
  it("Entfernung Stephansdom – Staatsoper ≈ 700 m", () => {
    const d = distanceM(PLACES.find((p) => p.key === "stephansdom")!.coord, PLACES.find((p) => p.key === "staatsoper")!.coord);
    expect(d).toBeGreaterThan(600);
    expect(d).toBeLessThan(800);
  });
  it("Punkte nach Entfernung", () => {
    expect(scoreForDistance(50)).toBe(100);
    expect(scoreForDistance(3000)).toBe(0);
    expect(scoreForDistance(1575)).toBe(50);
  });
  it("Beherrschung aus den letzten 5 Versuchen", () => {
    expect(districtMastery([])).toBe(0);
    expect(districtMastery([true, true])).toBe(40);
    expect(districtMastery([false, true, true, true, true, true])).toBe(100);
  });
  it("Routenprüfung", () => {
    const r = ROUTES[0];
    expect(checkRoute(r, r.segments.map((s) => s.name)).correct).toBe(true);
    const swapped = [r.segments[1].name, r.segments[0].name, ...r.segments.slice(2).map((s) => s.name)];
    expect(checkRoute(r, swapped)).toEqual({ correct: false, firstWrong: 0 });
  });
});
