"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { parseDrillSettings } from "@/lib/audio/drill";
import type { AudioMap } from "@/lib/audio/types";
import { getAudioMap } from "@/server/audio/urls";

/** Vorproduzierte Audios für Fragen (Stimme aus den Auto-Modus-Einstellungen). */
export async function getQuestionAudioAction(ids: string[]): Promise<AudioMap> {
  const user = await requireUser();
  const list = z.array(z.string().max(64)).max(300).parse(ids);
  const row = await prisma.audioDrillSettings.findUnique({ where: { userId: user.id }, select: { settings: true } });
  return getAudioMap(list, parseDrillSettings(row?.settings).voice);
}
