import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { loadChapter } from "@/components/lernbuch/chapter-loader";
import { ListReader } from "@/components/lernbuch/readers";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Lernbuch – Lese-Liste" };

export default async function Page({ params }: { params: Promise<{ topicId: string; chapterId: string }> }) {
  const { topicId, chapterId } = await params;
  const { chapter, cards, settings, backHref } = await loadChapter(topicId, chapterId);
  return (
    <div>
      <Link href={backHref} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-link">
        <ChevronLeft className="size-4" /> {chapter.name}
      </Link>
      <PageHeader eyebrow="Lese-Liste" title={chapter.name} />
      <ListReader categoryId={chapter.id} cards={cards} settings={settings} />
    </div>
  );
}
