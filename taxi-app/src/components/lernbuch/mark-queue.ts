"use client";

import type { ReadStatus } from "@/lib/lernbuch";
import { markCardAction } from "@/server/actions/lernbuch";

const QUEUE_KEY = "tp-lb-queue";
type QueueItem = { q: string; s: ReadStatus | "starred" | "unstarred" };

function loadQueue(): QueueItem[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as QueueItem[];
  } catch {
    return [];
  }
}
function saveQueue(items: QueueItem[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-200)));
  } catch {
    /* ignorieren */
  }
}

/** Markierung senden – offline in eine Warteschlange, beim nächsten Mal nachgereicht. */
export async function sendMark(q: string, s: QueueItem["s"]) {
  try {
    const r = await markCardAction(q, s);
    if (!r.ok) throw new Error(r.error);
  } catch {
    saveQueue([...loadQueue(), { q, s }]);
  }
}
export async function flushQueue() {
  const items = loadQueue();
  if (!items.length) return;
  saveQueue([]);
  for (const it of items) await sendMark(it.q, it.s);
}

