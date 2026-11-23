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
  Mic,
  Trophy,
  Swords,
  WifiOff,
  MessageCircleHeart,
  Settings,
  Shield,
  Sparkles,
  Languages,
  Hash,
  Route as RouteIcon,
  Library,
  Dumbbell,
  User,
} from "lucide-react";

export const mainNav = [
  { href: "/dashboard", label: "Übersicht", icon: Home },
  { href: "/lernbuch", label: "Lernbuch", icon: Library },
  { href: "/ueben", label: "Üben", icon: Dumbbell },
  { href: "/coach", label: "Dein Taxi-Coach", icon: MessageCircleHeart },
  { href: "/lernen", label: "Lektionen", icon: BookOpen },
  { href: "/quiz", label: "Quiz", icon: Sparkles },
  { href: "/pruefung", label: "Prüfungsmodus", icon: ClipboardCheck },
  { href: "/muendlich", label: "Mündliche Prüfung", icon: Mic },
  { href: "/fehler", label: "Falsche Antworten", icon: RotateCcw },
  { href: "/lernkarten", label: "Lernkarten", icon: Layers },
  { href: "/zahlen", label: "Zahlen-Trainer", icon: Hash },
  { href: "/ortskunde", label: "Ortskunde-Karte", icon: Map },
  { href: "/ortskunde/routen", label: "Routen in Etappen", icon: RouteIcon },
  { href: "/challenge", label: "Daily Challenge", icon: Trophy },
  { href: "/duell", label: "Duell", icon: Swords },
  { href: "/fortschritt", label: "Mein Fortschritt", icon: BarChart3 },
  { href: "/lernplan", label: "Lernplan", icon: CalendarDays },
  { href: "/offline-lernen", label: "Offline lernen", icon: WifiOff },
  { href: "/fragen", label: "Fragensuche", icon: Search },
  { href: "/fragen?merkliste=1", label: "Merkliste", icon: BookmarkCheck },
];

export const mobileNav: { href: string; label: string; icon: typeof Home; also?: string[] }[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/lernbuch", label: "Lernen", icon: BookOpen },
  { href: "/fortschritt", label: "Fortschritt", icon: BarChart3, also: ["/fehler", "/lernplan"] },
  { href: "/profil", label: "Profil", icon: User },
];

/** Bereiche, in denen der mittlere Quiz-Knopf als aktiv gilt (Üben, Prüfung, Mündlich …) */
export const QUIZ_PATHS = ["/quiz", "/ueben", "/lernen", "/lernkarten", "/pruefung", "/muendlich", "/challenge"];

/** Gehört der Pfad zum Tab? (inkl. Unterseiten und zugeordneter Bereiche) */
export function pathInTab(pathname: string, tab: (typeof mobileNav)[number]): boolean {
  return [tab.href, ...(tab.also ?? [])].some((h) => pathname === h || pathname.startsWith(`${h}/`));
}

/** Index des Tabs, zu dem ein Pfad gehört (für die Richtung der Seitenübergänge). */
export function tabIndexFor(pathname: string): number {
  return mobileNav.findIndex((t) => pathInTab(pathname, t));
}

/** Seiten mit schwebendem Coach-Knopf (Toni). */
export const COACH_FAB_PATHS = ["/dashboard", "/lernbuch", "/ueben", "/lernen", "/fehler", "/lernkarten"];

export const adminNav = [
  { href: "/admin", label: "Admin-Übersicht", icon: Shield },
  { href: "/admin/fragen", label: "Fragen", icon: ListChecks },
  { href: "/admin/kategorien", label: "Kategorien", icon: BookOpen },
  { href: "/admin/quellen", label: "Quellen", icon: BookmarkCheck },
  { href: "/admin/varianten", label: "KI-Varianten", icon: Languages },
  { href: "/admin/zahlen", label: "Zahlen-Fakten", icon: Hash },
  { href: "/admin/muendlich", label: "Mündliche Fragen", icon: Mic },
  { href: "/admin/lernplan", label: "Lernplan", icon: CalendarDays },
  { href: "/admin/import", label: "Import / Export", icon: Layers },
  { href: "/admin/erklaerungen", label: "Fehlende Erklärungen", icon: MessageCircleHeart },
  { href: "/admin/audio", label: "Audio-Studio", icon: Mic },
  { href: "/admin/stories", label: "Stories", icon: Sparkles },
  { href: "/admin/pruefungen", label: "Prüfungen", icon: ClipboardCheck },
  { href: "/admin/benutzer", label: "Benutzer", icon: Home },
  { href: "/admin/einstellungen", label: "Einstellungen", icon: Settings },
];
