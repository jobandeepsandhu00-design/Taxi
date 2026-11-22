"use client";

import { useCallback, useRef } from "react";
import type { AudioMap, QuestionAudioSet } from "@/lib/audio/types";
import { getQuestionAudioAction } from "@/server/actions/audio";

const cache: AudioMap = {};
const known = new Set<string>();

/** Audios einer/mehrerer Fragen laden (einmal pro Sitzung zwischengespeichert). */
export function useQuestionAudio() {
  const pending = useRef<Promise<void> | null>(null);
  const load = useCallback(async (ids: string[]): Promise<AudioMap> => {
    const missing = ids.filter((id) => !known.has(id));
    if (missing.length) {
      pending.current = getQuestionAudioAction(missing)
        .then((m) => {
          Object.assign(cache, m);
          missing.forEach((id) => known.add(id));
        })
        .catch(() => undefined);
      await pending.current;
    }
    return Object.fromEntries(ids.map((id) => [id, cache[id] ?? {}]));
  }, []);
  const get = useCallback(async (id: string): Promise<QuestionAudioSet> => (await load([id]))[id] ?? {}, [load]);
  return { load, get };
}
