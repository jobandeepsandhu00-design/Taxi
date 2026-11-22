"use server";

import { requireUser } from "@/lib/auth/session";
import { getLauncherData, type LauncherData } from "@/server/quiz-launch";

export async function getLauncherDataAction(): Promise<LauncherData> {
  const user = await requireUser();
  return getLauncherData(user.id);
}
