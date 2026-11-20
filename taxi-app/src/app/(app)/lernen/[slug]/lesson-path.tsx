"use client";

import { motion } from "motion/react";
import { Check, Crown, Play } from "lucide-react";
import { useFormStatus } from "react-dom";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { startLessonAction } from "@/server/actions/learning";

interface Item {
  index: number;
  status: "offen" | "erledigt" | "gemeistert";
  best: number | null;
  size: number;
}

const statusStyle = {
  offen: { cls: "border-border bg-card text-navy", label: "offen" },
  erledigt: { cls: "border-primary/60 bg-secondary text-secondary-foreground", label: "erledigt" },
  gemeistert: { cls: "border-success bg-success/12 text-success", label: "gemeistert" },
} as const;

function Inner({ item }: { item: Item }) {
  const { pending } = useFormStatus();
  const s = statusStyle[item.status];
  return (
    <span className={cn("flex min-h-[72px] w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 p-2 text-center transition active:scale-95", s.cls, pending && "opacity-60")}>
      <span className="flex size-8 items-center justify-center rounded-full bg-background/60">
        {item.status === "gemeistert" ? <Crown className="size-4" /> : item.status === "erledigt" ? <Check className="size-4" /> : <Play className="size-4" />}
      </span>
      <span className="text-xs font-bold">Lektion {item.index}</span>
      <span className="text-[10px] font-semibold opacity-80">
        {s.label}
        {item.best !== null && item.status !== "gemeistert" ? ` · ${item.best}/${item.size}` : ""}
      </span>
    </span>
  );
}

/** Kategorie-Lektionen als Kacheln: offen / erledigt / gemeistert. */
export function LessonPath({ categoryId, lessons }: { categoryId: string; lessons: Item[] }) {
  if (lessons.length === 0) return <p className="text-sm text-muted-foreground">Noch keine Fragen in dieser Kategorie.</p>;
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-label="Lektionen">
      {lessons.map((l, i) => (
        <motion.li key={l.index} initial={{ opacity: 0, y: 12, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ...spring, delay: Math.min(i, 12) * 0.04 }}>
          <form action={startLessonAction}>
            <input type="hidden" name="categoryId" value={categoryId} />
            <input type="hidden" name="lessonIndex" value={l.index} />
            <button type="submit" className="w-full" aria-label={`Lektion ${l.index} starten – ${statusStyle[l.status].label}`}>
              <Inner item={l} />
            </button>
          </form>
        </motion.li>
      ))}
    </ul>
  );
}
