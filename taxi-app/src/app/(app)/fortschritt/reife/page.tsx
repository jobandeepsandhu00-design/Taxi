import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { dayKey } from "@/lib/dates";
import { projectReadyDate } from "@/lib/readiness";
import { getReadiness, readinessTrend } from "@/server/readiness";
import { ReifeView } from "./reife-view";

export const metadata: Metadata = { title: "Prüfungsreife" };

export default async function ReifePage() {
  const user = await requireUser();
  const [readiness, trend] = await Promise.all([getReadiness(user.id), readinessTrend(user.id, 14)]);
  const projection = projectReadyDate(trend, dayKey());
  return <ReifeView readiness={readiness} trend={trend} projection={projection} />;
}
