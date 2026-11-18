export const APP_TIMEZONE = "Europe/Vienna";

/** Kalendertag (YYYY-MM-DD) in der Zeitzone Europe/Vienna */
export function dayKey(date: Date = new Date(), timeZone = APP_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Wandelt einen Tagesschlüssel in ein Date (UTC-Mitternacht) für @db.Date-Spalten um */
export function dayKeyToDate(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

export function dateToDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(key: string, days: number): string {
  const d = dayKeyToDate(key);
  d.setUTCDate(d.getUTCDate() + days);
  return dateToDayKey(d);
}

export function diffDays(fromKey: string, toKey: string): number {
  return Math.round((dayKeyToDate(toKey).getTime() - dayKeyToDate(fromKey).getTime()) / 86_400_000);
}

/** Letzte n Tage (inkl. heute), älteste zuerst */
export function lastNDays(n: number, today = dayKey()): string[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i - (n - 1)));
}

const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
export function weekdayShort(key: string): string {
  return WEEKDAYS[dayKeyToDate(key).getUTCDay()];
}
