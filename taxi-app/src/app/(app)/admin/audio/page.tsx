import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { getAudioStatusAction, listLexiconAction } from "@/server/actions/admin-audio";
import { AudioStudio } from "./audio-studio";

export const metadata: Metadata = { title: "Audio-Studio" };

export default async function AudioStudioPage() {
  const [status, lexicon] = await Promise.all([getAudioStatusAction(), listLexiconAction()]);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Administration" title="Audio-Studio" description="Jede Frage in jedem Kapitel bekommt vorproduzierte Audios für Frage und Antwort – einmal erzeugt, gespeichert und für alle Lernenden abgespielt (auch offline)." />
      <AudioStudio initial={status} lexicon={lexicon.map((l) => ({ term: l.term, spoken: l.spoken, notes: l.notes }))} />
    </div>
  );
}
