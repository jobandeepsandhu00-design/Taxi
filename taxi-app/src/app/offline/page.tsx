import { CoachAvatar } from "@/components/coach/coach-avatar";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 pt-[max(24px,env(safe-area-inset-top))] pb-[max(24px,env(safe-area-inset-bottom))] text-center">
      <CoachAvatar mood="sad" size={96} />
      <h1 className="text-2xl font-bold text-navy">Du bist offline</h1>
      <p className="max-w-sm text-muted-foreground">Heruntergeladene Kapitel funktionieren weiter. Dein Fortschritt wird gespeichert, sobald du wieder online bist.</p>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <a href="/offline-lernen" className="min-h-12 rounded-2xl bg-[#ffc400] px-5 py-3 font-extrabold text-[#111]">
          Heruntergeladene Kapitel üben
        </a>
        <a href="/dashboard" className="min-h-12 rounded-2xl border border-border px-5 py-3 font-semibold text-link">
          Erneut versuchen
        </a>
      </div>
    </div>
  );
}
