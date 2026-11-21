import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { loadChapter } from "@/components/lernbuch/chapter-loader";
import { AudioReader } from "@/components/lernbuch/readers";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Lernbuch – Hör-Modus" };

export default async function Page({ params }: { params: Promise<{ topicId: string; chapterId: string }> }) {
  const { topicId, chapterId } = await params;
  const { chapter, cards, settings, backHref } = await loadChapter(topicId, chapterId);
  return (
    <div>
      <Link href={backHref} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-link">
        <ChevronLeft className="size-4" /> {chapter.name}
      </Link>
      <PageHeader eyebrow="Hör-Modus" title={chapter.name} />
      <AudioReader categoryId={chapter.id} cards={cards} settings={settings} />
    </div>
  );
}
