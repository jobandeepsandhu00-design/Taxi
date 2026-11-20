import {
  BarChart3,
  BookOpen,
  BookmarkCheck,
  ClipboardCheck,
  Home,
  Layers,
  ListChecks,
  RotateCcw,
  Search,
  CalendarDays,
  Map,
  Trophy,
  Swords,
  WifiOff,
  Settings,
  Shield,
  Sparkles,
} from "lucide-react";

export const mainNav = [
  { href: "/dashboard", label: "Übersicht", icon: Home },
  { href: "/lernen", label: "Lernen", icon: BookOpen },
  { href: "/quiz", label: "Quiz", icon: Sparkles },
  { href: "/pruefung", label: "Prüfungsmodus", icon: ClipboardCheck },
  { href: "/fehler", label: "Falsche Antworten", icon: RotateCcw },
  { href: "/lernkarten", label: "Lernkarten", icon: Layers },
  { href: "/ortskunde", label: "Ortskunde-Karte", icon: Map },
  { href: "/challenge", label: "Daily Challenge", icon: Trophy },
  { href: "/duell", label: "Duell", icon: Swords },
  { href: "/fortschritt", label: "Mein Fortschritt", icon: BarChart3 },
  { href: "/lernplan", label: "Lernplan", icon: CalendarDays },
  { href: "/offline-lernen", label: "Offline lernen", icon: WifiOff },
  { href: "/fragen", label: "Fragensuche", icon: Search },
  { href: "/fragen?merkliste=1", label: "Merkliste", icon: BookmarkCheck },
];

export const mobileNav = [
  { href: "/dashboard", label: "Start", icon: Home },
  { href: "/lernen", label: "Lernen", icon: BookOpen },
  { href: "/pruefung", label: "Prüfung", icon: ClipboardCheck },
  { href: "/fehler", label: "Fehler", icon: RotateCcw },
  { href: "/fortschritt", label: "Fortschritt", icon: BarChart3 },
];

/** Index des Tabs, zu dem ein Pfad gehört (für die Richtung der Seitenübergänge). */
export function tabIndexFor(pathname: string): number {
  return mobileNav.findIndex((t) => pathname === t.href || pathname.startsWith(`${t.href}/`));
}

export const adminNav = [
  { href: "/admin", label: "Admin-Übersicht", icon: Shield },
  { href: "/admin/fragen", label: "Fragen", icon: ListChecks },
  { href: "/admin/kategorien", label: "Kategorien", icon: BookOpen },
  { href: "/admin/quellen", label: "Quellen", icon: BookmarkCheck },
  { href: "/admin/import", label: "Import / Export", icon: Layers },
  { href: "/admin/pruefungen", label: "Prüfungen", icon: ClipboardCheck },
  { href: "/admin/benutzer", label: "Benutzer", icon: Home },
  { href: "/admin/einstellungen", label: "Einstellungen", icon: Settings },
];
