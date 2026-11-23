import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getStoryFeed } from "@/server/stories/feed";
import { StoryPage } from "./story-page";

export const metadata: Metadata = { title: "Story" };

/** Vollbild-Story als eigene Seite (z. B. aus einer Push-Benachrichtigung). */
export default async function StoryRoute({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const user = await requireUser();
  const groups = await getStoryFeed(user.id);
  if (!groups.some((g) => g.key === key)) notFound();
  return <StoryPage groups={groups} startKey={key} />;
}
