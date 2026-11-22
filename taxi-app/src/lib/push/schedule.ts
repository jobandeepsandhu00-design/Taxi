/** Zeit-Logik für Benachrichtigungen (Zeitzone, Ruhezeiten, Erinnerungsfenster) – rein, testbar. */

/** Uhrzeit „HH:MM“ und Datum „YYYY-MM-DD“ in einer Zeitzone. */
export function localParts(now: Date, timeZone = "Europe/Vienna"): { date: string; hm: string; minutes: number; weekday: number } {
  let tz = timeZone;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
  } catch {
    tz = "Europe/Vienna";
  }
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short" });
  const p = Object.fromEntries(f.formatToParts(now).map((x) => [x.type, x.value]));
  const hm = `${p.hour}:${p.minute}`;
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return { date: `${p.year}-${p.month}-${p.day}`, hm, minutes: toMinutes(hm), weekday: days.indexOf(p.weekday ?? "Sun") };
}

export function toMinutes(hm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm);
  if (!m) return 0;
  return (Number(m[1]) % 24) * 60 + (Number(m[2]) % 60);
}

/** Liegt `minutes` in den Ruhezeiten [start, end)? Unterstützt Zeiträume über Mitternacht (22:00–08:00). */
export function inQuietHours(minutes: number, start: string, end: string): boolean {
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (s === e) return false;
  return s < e ? minutes >= s && minutes < e : minutes >= s || minutes < e;
}

/** Fällt die Erinnerungszeit in das aktuelle Cron-Fenster [now, now + windowMin)? */
export function reminderDue(reminderTime: string, nowMinutes: number, windowMin = 15): boolean {
  const r = toMinutes(reminderTime);
  const diff = (r - nowMinutes + 1440) % 1440;
  return diff < windowMin;
}

export const DAILY_CAP = 2;
/** Diese Typen zählen nicht zum Tageslimit. */
export const CAP_EXEMPT = new Set(["duel", "test"]);
/** Diese Typen ignorieren Ruhezeiten (vom Nutzer selbst ausgelöst). */
export const QUIET_EXEMPT = new Set(["test"]);

export const EXAM_COUNTDOWN_DAYS = [30, 14, 7, 3, 1];

export function isValidHm(v: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}
