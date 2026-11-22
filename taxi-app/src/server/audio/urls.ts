import "server-only";
import { prisma } from "@/lib/db";
import type { AudioMap } from "@/lib/audio/types";
import { getAudioConfig, type VoiceChoice } from "./config";
import { audioPublicUrl } from "./storage";

/** Fertige Audios für Fragen (gewünschte Stimme, sonst die andere als Ersatz). */
export async function getAudioMap(questionIds: string[], voice?: VoiceChoice): Promise<AudioMap> {
  if (questionIds.length === 0) return {};
  const cfg = await getAudioConfig();
  const wanted = voice === "male" ? cfg.voices.male : voice === "female" ? cfg.voices.female : cfg.defaultVoiceId;
  const rows = await prisma.questionAudio.findMany({
    where: { questionId: { in: questionIds }, status: "done", storagePathMp3: { not: null } },
    select: { questionId: true, kind: true, voiceId: true, storagePathMp3: true, storagePathOpus: true, durationMs: true, source: true },
  });
  const map: AudioMap = {};
  // Reihenfolge: andere Stimme zuerst, gewünschte überschreibt; eigene Aufnahme hat Vorrang
  const rank = (r: (typeof rows)[number]) => (r.source === "upload" ? 3 : r.voiceId === wanted ? 2 : 1);
  for (const r of [...rows].sort((a, b) => rank(a) - rank(b))) {
    const set = (map[r.questionId] ??= {});
    set[r.kind as keyof typeof set] = { mp3: audioPublicUrl(r.storagePathMp3!), opus: r.storagePathOpus ? audioPublicUrl(r.storagePathOpus) : null, ms: r.durationMs };
  }
  return map;
}
