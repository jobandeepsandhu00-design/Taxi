import { CheckCircle2, Circle, CircleDot, Trophy } from "lucide-react";
import type { ChapterState } from "@/lib/lernbuch";
import { cn } from "@/lib/utils";

const MAP: Record<ChapterState, { label: string; cls: string; Icon: typeof Circle }> = {
  neu: { label: "Neu", cls: "bg-foreground/8 text-muted-foreground", Icon: Circle },
  weiterlesen: { label: "Weiterlesen", cls: "bg-primary/15 text-primary", Icon: CircleDot },
  gelesen: { label: "Gelesen", cls: "bg-success/15 text-success", Icon: CheckCircle2 },
  check: { label: "Check bestanden", cls: "bg-success/20 text-success", Icon: Trophy },
};

export function ChapterStateBadge({ state, className }: { state: ChapterState; className?: string }) {
  const m = MAP[state];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", m.cls, className)}>
      <m.Icon className="size-3.5" aria-hidden /> {m.label}
    </span>
  );
}
