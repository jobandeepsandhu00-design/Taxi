import "server-only";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { topicIdForSlug } from "@/lib/lernbuch";
import { getChapterBySlug, getChapterCards, getLernbuchSettings } from "@/server/lernbuch";

/** Gemeinsames Laden für Lese-Liste, Hör-Modus und Karteikarten. */
export async function loadChapter(topicId: string, slug: string) {
  const user = await requireUser();
  const chapter = await getChapterBySlug(slug);
  if (!chapter || topicIdForSlug(chapter.slug) !== topicId) notFound();
  const [cards, settings] = await Promise.all([getChapterCards(user.id, chapter.id), getLernbuchSettings(user.id)]);
  return { chapter, cards, settings, backHref: `/lernbuch/${topicId}/${chapter.slug}` };
}
