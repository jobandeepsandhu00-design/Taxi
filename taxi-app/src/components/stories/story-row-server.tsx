import { dayKey } from "@/lib/dates";
import { getStoryFeed } from "@/server/stories/feed";
import { StoryRow } from "./story-row";

/** Lädt die Stories getrennt (Suspense), damit die Startseite nicht darauf wartet. */
export async function StoryRowServer({ userId, isAdmin = false }: { userId: string; isAdmin?: boolean }) {
  const groups = await getStoryFeed(userId).catch((e) => {
    console.warn("stories:", e instanceof Error ? e.message : e);
    return [];
  });
  return <StoryRow groups={groups} today={dayKey()} isAdmin={isAdmin} />;
}
