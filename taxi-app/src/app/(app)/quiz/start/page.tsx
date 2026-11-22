import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { parseQuizConfig } from "@/lib/quiz-config";
import { launchQuiz, LaunchError } from "@/server/quiz-launch";

export const dynamic = "force-dynamic";

/** /quiz/start?type=muendlich&mode=simulation&d=30 → Sitzung anlegen → Vollbild-Quiz */
export default async function QuizStartPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const cfg = parseQuizConfig(await searchParams);
  let path: string | null = null;
  let error = "Diese Quiz-Einstellung ist ungültig.";
  if (cfg) {
    try {
      path = await launchQuiz(user.id, cfg);
    } catch (e) {
      error = e instanceof LaunchError ? e.message : "Das Quiz konnte nicht gestartet werden.";
    }
  }
  if (path) redirect(path);
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <p className="text-4xl" aria-hidden>
        🚕
      </p>
      <h1 className="mt-3 text-xl font-extrabold text-navy">{error}</h1>
      <Link href="/dashboard" className="mt-5 inline-flex h-11 items-center rounded-xl bg-primary px-5 font-bold text-primary-foreground">
        Zur Startseite
      </Link>
    </div>
  );
}
