/** Typen des Lernplans (Antwort der Datenbankfunktion get_learn_plan). */
export type QuestionStatus = "neu" | "falsch" | "lernen" | "sicher" | "gemeistert";
export type LessonStatus = "gesperrt" | "offen" | "in_arbeit" | "gemeistert";

export interface PlanQuestion {
  id: string;
  short_title: string;
  type: "einfach" | "mehrfach" | "bild";
  status: QuestionStatus;
  faellig: boolean;
  box: number | null;
}

export interface PlanLesson {
  index: number;
  status: LessonStatus;
  progress: number;
  answered: number;
  size: number;
  in_today_plan: boolean;
  questions: PlanQuestion[];
}

export interface PlanCounts {
  total: number;
  neu: number;
  falsch: number;
  lernen: number;
  sicher: number;
  gemeistert: number;
  faellig: number;
}

export interface PlanSection {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  progress: number;
  counts: PlanCounts;
  lessons: PlanLesson[];
}

export interface LearnPlan {
  sections: PlanSection[];
  totals: { total: number; neu: number; falsch: number; faellig: number; gemeistert: number; progress: number };
  goal: { remaining_lessons: number; per_day: number; exam_date: string | null; days_left: number | null };
  next: { category_id: string; lesson_index: number; section: string; status: LessonStatus } | null;
}

export const LOCK_SHARE = 0.6;
