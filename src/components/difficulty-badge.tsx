import type { Difficulty } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { difficultyLabel } from "@/lib/labels";

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const variant = difficulty === "EASY" ? "success" : difficulty === "MEDIUM" ? "default" : "destructive";
  return <Badge variant={variant}>{difficultyLabel[difficulty]}</Badge>;
}
