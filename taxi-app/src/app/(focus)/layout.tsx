import { redirect } from "next/navigation";
import { CoachProvider } from "@/components/coach/coach-provider";
import { QueryProvider } from "@/components/query-provider";
import { ThemeSync } from "@/components/theme/theme-sync";
import { requireUser } from "@/lib/auth/session";
import { coachConfigured } from "@/server/coach/llm";

/** Fokus-Modus: keine Kopfzeile, keine untere Navigation, kein Avatar/Menü – nur die Aufgabe. */
export default async function FocusLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.role === "STUDENT" && !user.onboardedAt) redirect("/willkommen");
  return (
    <QueryProvider>
      <CoachProvider enabled={coachConfigured()}>
        <ThemeSync uid={user.id} theme={user.theme} mode={user.themeMode} helperLang={user.helperLang} />
        {children}
      </CoachProvider>
    </QueryProvider>
  );
}
