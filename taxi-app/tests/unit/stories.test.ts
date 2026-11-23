import { describe, expect, it } from "vitest";
import { firstUnseenIndex, isGroupSeen, orderGroups, pickRotation, safeRoute, timeAgo } from "@/lib/stories";

const s = (id: string) => ({ id, title: id, body: "", durationMs: 6000 });

describe("stories", () => {
  it("Reihenfolge: persönlich, ungesehen, gesehen; leere Gruppen entfallen", () => {
    const groups = [
      { key: "a", personal: false, slides: [s("1")], seenIds: ["1"] },
      { key: "b", personal: false, slides: [s("2")], seenIds: [] },
      { key: "toni", personal: true, slides: [s("3")], seenIds: ["3"] },
      { key: "leer", personal: false, slides: [], seenIds: [] },
    ];
    expect(orderGroups(groups).map((g) => g.key)).toEqual(["toni", "b", "a"]);
  });
  it("gesehen / erste ungesehene Folie", () => {
    expect(isGroupSeen({ slides: [s("1"), s("2")], seenIds: ["1"] })).toBe(false);
    expect(firstUnseenIndex({ slides: [s("1"), s("2")], seenIds: ["1"] })).toBe(1);
    expect(firstUnseenIndex({ slides: [s("1")], seenIds: ["1"] })).toBe(0);
  });
  it("Rotation ohne Wiederholung in 30 Tagen, Rückfall auf älteste", () => {
    const pool = ["a", "b", "c", "d"];
    const pick = pickRotation(pool, ["a", "b"], 2, 20261123);
    expect(pick.sort()).toEqual(["c", "d"]);
    const fallback = pickRotation(pool, ["a", "b", "c"], 2, 1);
    expect(fallback).toContain("d");
    expect(fallback).toContain("c"); // c ist der am längsten nicht verwendete (letzter in recent)
    expect(pickRotation(["x"], [], 3, 1)).toEqual(["x"]);
  });
  it("Zeitangaben", () => {
    const now = Date.parse("2026-11-23T12:00:00Z");
    expect(timeAgo("2026-11-23T11:59:30Z", now)).toBe("gerade eben");
    expect(timeAgo("2026-11-23T10:00:00Z", now)).toBe("vor 2 Std");
    expect(timeAgo("2026-11-21T12:00:00Z", now)).toBe("vor 2 Tagen");
  });
  it("CTA nur intern", () => {
    expect(safeRoute("/lernen?x=1")).toBe("/lernen?x=1");
    expect(safeRoute("https://evil.example")).toBeNull();
    expect(safeRoute("//evil.example")).toBeNull();
    expect(safeRoute("javascript:alert(1)")).toBeNull();
  });
});
