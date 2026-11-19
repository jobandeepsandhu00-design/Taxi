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

/** Kategorie-Farben – dezent eingesetzt (Akzent, Balken, Icon-Tönung), keine vollflächigen Verläufe.
 *  Volle Klassennamen, damit Tailwind sie erkennt. */
export const CATEGORY_COLORS: Record<string, { gradient: string; soft: string; text: string; ring: string; hex: string }> = {
  blue: { gradient: "from-[#3b82f6] to-[#3b82f6]", soft: "bg-[#3b82f6]/12", text: "text-[#3b82f6]", ring: "ring-[#3b82f6]/30", hex: "#3b82f6" },
  indigo: { gradient: "from-[#6366f1] to-[#6366f1]", soft: "bg-[#6366f1]/12", text: "text-[#6366f1]", ring: "ring-[#6366f1]/30", hex: "#6366f1" },
  violet: { gradient: "from-[#8b5cf6] to-[#8b5cf6]", soft: "bg-[#8b5cf6]/12", text: "text-[#8b5cf6]", ring: "ring-[#8b5cf6]/30", hex: "#8b5cf6" },
  emerald: { gradient: "from-[#10b981] to-[#10b981]", soft: "bg-[#10b981]/12", text: "text-[#10b981]", ring: "ring-[#10b981]/30", hex: "#10b981" },
  amber: { gradient: "from-[#d97706] to-[#d97706]", soft: "bg-[#d97706]/12", text: "text-[#d97706]", ring: "ring-[#d97706]/30", hex: "#d97706" },
  rose: { gradient: "from-[#f43f5e] to-[#f43f5e]", soft: "bg-[#f43f5e]/12", text: "text-[#f43f5e]", ring: "ring-[#f43f5e]/30", hex: "#f43f5e" },
  cyan: { gradient: "from-[#0891b2] to-[#0891b2]", soft: "bg-[#0891b2]/12", text: "text-[#0891b2]", ring: "ring-[#0891b2]/30", hex: "#0891b2" },
  orange: { gradient: "from-[#ea580c] to-[#ea580c]", soft: "bg-[#ea580c]/12", text: "text-[#ea580c]", ring: "ring-[#ea580c]/30", hex: "#ea580c" },
  teal: { gradient: "from-[#0d9488] to-[#0d9488]", soft: "bg-[#0d9488]/12", text: "text-[#0d9488]", ring: "ring-[#0d9488]/30", hex: "#0d9488" },
  sky: { gradient: "from-[#0284c7] to-[#0284c7]", soft: "bg-[#0284c7]/12", text: "text-[#0284c7]", ring: "ring-[#0284c7]/30", hex: "#0284c7" },
  slate: { gradient: "from-[#64748b] to-[#64748b]", soft: "bg-[#64748b]/12", text: "text-[#64748b]", ring: "ring-[#64748b]/30", hex: "#64748b" },
};

export function categoryColor(name: string) {
  return CATEGORY_COLORS[name] ?? CATEGORY_COLORS.blue;
}
