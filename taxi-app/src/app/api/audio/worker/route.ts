import { after, NextResponse, type NextRequest } from "next/server";
import { processAudioQueue, triggerAudioWorker, workerSecret } from "@/server/audio/jobs";

export const maxDuration = 60;

function authorized(request: NextRequest) {
  const cron = process.env.CRON_SECRET;
  return request.headers.get("x-audio-worker") === workerSecret() || (cron && request.headers.get("authorization") === `Bearer ${cron}`);
}

/**
 * Audio-Worker: verarbeitet einen Stapel (Zeitbudget ~40 s) und ruft sich selbst erneut auf,
 * solange noch Dateien offen sind – so laufen auch lange Aufträge ohne Funktions-Timeout.
 */
async function run(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Nicht erlaubt" }, { status: 401 });
  const result = await processAudioQueue(40_000);
  if (result.remaining > 0 && result.processed > 0) {
    const origin = request.nextUrl.origin;
    after(() => triggerAudioWorker(origin));
  }
  return NextResponse.json(result);
}

export const POST = run;
/** Täglicher Cron als Sicherheitsnetz für liegengebliebene Aufträge */
export const GET = run;
