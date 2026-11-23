"use client";

import { useRouter } from "next/navigation";
import { StoryViewer } from "@/components/stories/story-viewer";
import type { StoryGroupData } from "@/lib/stories";

export function StoryPage({ groups, startKey }: { groups: StoryGroupData[]; startKey: string }) {
  const router = useRouter();
  return (
    <StoryViewer
      groups={groups}
      startKey={startKey}
      mode="page"
      onClose={() => {
        if (window.history.length > 1) router.back();
        else router.replace("/dashboard");
      }}
    />
  );
}
