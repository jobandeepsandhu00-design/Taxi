"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { haptic, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/lernen", label: "Lektionen" },
  { href: "/fehler", label: "Fehlertraining" },
  { href: "/ueben", label: "Wiederholung" },
  { href: "/lernkarten", label: "Karteikarten" },
];

/** Unter-Tabs des Bereichs „Üben“ (Lektionen · Fehlertraining · Wiederholung · Karteikarten). */
export function UebenTabs() {
  const pathname = usePathname();
  const show = TABS.some((t) => pathname === t.href);
  if (!show) return null;
  return (
    <nav aria-label="Üben" className="-mx-1 mb-5 overflow-x-auto px-1">
      <ul className="glass inline-flex min-w-full gap-1 rounded-2xl p-1 sm:min-w-0">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <li key={t.href} className="flex-1 sm:flex-none">
              <Link
                href={t.href}
                onClick={() => haptic()}
                aria-current={active ? "page" : undefined}
                className={cn("relative block rounded-xl px-3 py-2 text-center text-xs font-bold whitespace-nowrap transition-colors sm:px-4 sm:text-sm", active ? "text-primary-foreground" : "text-foreground/70 hover:text-foreground")}
              >
                {active && <motion.span layoutId="ueben-pill" className="absolute inset-0 rounded-xl bg-primary" transition={spring} />}
                <span className="relative">{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
