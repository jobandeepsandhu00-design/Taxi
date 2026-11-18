import {
  BookOpen,
  Briefcase,
  Building2,
  Calculator,
  Car,
  HeartHandshake,
  Landmark,
  MapPinned,
  Scale,
  ShieldCheck,
  TrafficCone,
  Users,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  BookOpen,
  Briefcase,
  Building2,
  Calculator,
  Car,
  HeartHandshake,
  Landmark,
  MapPinned,
  Scale,
  ShieldCheck,
  TrafficCone,
  Users,
};

export function categoryIcon(name: string): LucideIcon {
  return CATEGORY_ICONS[name] ?? BookOpen;
}

/** Farbpaletten für Kategorie-Karten (volle Klassennamen, damit Tailwind sie erkennt) */
export const CATEGORY_COLORS: Record<string, { gradient: string; soft: string; text: string; ring: string; hex: string }> = {
  blue: { gradient: "from-blue-500 to-blue-700", soft: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-200", hex: "#2563eb" },
  indigo: { gradient: "from-indigo-500 to-indigo-700", soft: "bg-indigo-50", text: "text-indigo-700", ring: "ring-indigo-200", hex: "#4f46e5" },
  violet: { gradient: "from-violet-500 to-violet-700", soft: "bg-violet-50", text: "text-violet-700", ring: "ring-violet-200", hex: "#7c3aed" },
  emerald: { gradient: "from-emerald-500 to-emerald-700", soft: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", hex: "#059669" },
  amber: { gradient: "from-amber-400 to-amber-600", soft: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200", hex: "#d97706" },
  rose: { gradient: "from-rose-500 to-rose-700", soft: "bg-rose-50", text: "text-rose-700", ring: "ring-rose-200", hex: "#e11d48" },
  cyan: { gradient: "from-cyan-500 to-cyan-700", soft: "bg-cyan-50", text: "text-cyan-700", ring: "ring-cyan-200", hex: "#0891b2" },
  orange: { gradient: "from-orange-500 to-orange-700", soft: "bg-orange-50", text: "text-orange-700", ring: "ring-orange-200", hex: "#ea580c" },
  teal: { gradient: "from-teal-500 to-teal-700", soft: "bg-teal-50", text: "text-teal-700", ring: "ring-teal-200", hex: "#0d9488" },
  sky: { gradient: "from-sky-500 to-sky-700", soft: "bg-sky-50", text: "text-sky-700", ring: "ring-sky-200", hex: "#0284c7" },
  slate: { gradient: "from-slate-500 to-slate-700", soft: "bg-slate-50", text: "text-slate-700", ring: "ring-slate-200", hex: "#475569" },
};

export function categoryColor(name: string) {
  return CATEGORY_COLORS[name] ?? CATEGORY_COLORS.blue;
}
