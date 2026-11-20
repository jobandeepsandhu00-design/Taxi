import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { getWeeklyReport } from "@/server/coach/plans";
import { ReportStories } from "./report-stories";

export const metadata: Metadata = { title: "Wochenbericht" };
export const maxDuration = 60;

export default async function WeeklyReportPage() {
  const user = await requireUser();
  const { data, weekStart, preview } = await getWeeklyReport(user.id);
  return <ReportStories data={data} weekStart={weekStart} preview={preview} />;
}
