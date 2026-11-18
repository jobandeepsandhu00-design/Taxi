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
  { href: "/fortschritt", label: "Mein Fortschritt", icon: BarChart3 },
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
