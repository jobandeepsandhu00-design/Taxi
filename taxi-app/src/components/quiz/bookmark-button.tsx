"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { toggleBookmarkAction } from "@/server/actions/learning";

export function BookmarkButton({ questionId, initial }: { questionId: string; initial: boolean }) {
  const [bookmarked, setBookmarked] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? "Von der Merkliste entfernen" : "Zur Merkliste hinzufügen"}
      title={bookmarked ? "Gemerkt" : "Merken"}
      onClick={() =>
        start(async () => {
          const res = await toggleBookmarkAction(questionId);
          if (res.ok) setBookmarked(res.data.bookmarked);
        })
      }
      className={cn(
        "flex size-9 items-center justify-center rounded-xl border transition",
        bookmarked ? "border-warning/40 bg-warning/10 text-warning" : "glass text-muted-foreground hover:text-navy",
      )}
    >
      {bookmarked ? <BookmarkCheck className="size-[18px]" /> : <Bookmark className="size-[18px]" />}
    </button>
  );
}
