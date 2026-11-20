"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Check, Crown, Lock, Play } from "lucide-react";
import { useFormStatus } from "react-dom";
import type { LessonStatus } from "@/lib/learn-plan-types";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { startLessonAction } from "@/server/actions/learning";

interface Item {
  index: number;
  status: LessonStatus;
  progress: number;
  size: number;
}

export const lessonStatusStyle: Record<LessonStatus, { cls: string; label: string }> = {
  gesperrt: { cls: "border-border bg-muted text-muted-foreground", label: "gesperrt" },
  offen: { cls: "border-border bg-card text-navy", label: "offen" },
  in_arbeit: { cls: "border-primary/60 bg-secondary text-secondary-foreground", label: "in Arbeit" },
  gemeistert: { cls: "border-success bg-success/12 text-success", label: "gemeistert" },
};

function Inner({ item }: { item: Item }) {
  const { pending } = useFormStatus();
  const s = lessonStatusStyle[item.status];
  return (
    <span className={cn("flex min-h-[72px] w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 p-2 text-center transition active:scale-95", s.cls, pending && "opacity-60")}>
      <span className="flex size-8 items-center justify-center rounded-full bg-background/60">
        {item.status === "gemeistert" ? <Crown className="size-4" /> : item.status === "in_arbeit" ? <Check className="size-4" /> : item.status === "gesperrt" ? <Lock className="size-4" /> : <Play className="size-4" />}
      </span>
      <span className="text-xs font-bold">Lektion {item.index}</span>
      <span className="text-[10px] font-semibold opacity-80">{s.label}</span>
    </span>
  );
}

/** Kategorie-Lektionen als Kacheln (Status aus dem Lernplan). */
export function LessonPath({ categoryId, lessons }: { categoryId: string; lessons: Item[] }) {
  if (lessons.length === 0) return <p className="text-sm text-muted-foreground">Noch keine Fragen in dieser Kategorie.</p>;
  return (
    <>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-label="Lektionen">
        {lessons.map((l, i) => (
          <motion.li key={l.index} initial={{ opacity: 0, y: 12, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ ...spring, delay: Math.min(i, 12) * 0.04 }}>
            {l.status === "gesperrt" ? (
              <Link href={`/lernplan?gesperrt=${categoryId}:${l.index}`} aria-label={`Lektion ${l.index} – gesperrt`} className="block">
                <Inner item={l} />
              </Link>
            ) : (
              <form action={startLessonAction}>
                <input type="hidden" name="categoryId" value={categoryId} />
                <input type="hidden" name="lessonIndex" value={l.index} />
                <button type="submit" className="w-full" aria-label={`Lektion ${l.index} starten – ${lessonStatusStyle[l.status].label}`}>
                  <Inner item={l} />
                </button>
              </form>
            )}
          </motion.li>
        ))}
      </ul>
      <Link href="/lernplan" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-link hover:underline">
        Im Lernplan ansehen →
      </Link>
    </>
  );
}
