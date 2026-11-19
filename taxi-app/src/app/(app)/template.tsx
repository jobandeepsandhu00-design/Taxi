"use client";

import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import { tabIndexFor } from "@/components/layout/nav-items";

let lastTab = -1;

/** Seitenübergang: gleitet in Richtung des gewählten Tabs, mit Fade und leichter Skalierung. */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const tab = tabIndexFor(pathname);
  const dir = tab >= 0 && lastTab >= 0 && tab !== lastTab ? (tab > lastTab ? 1 : -1) : 0;
  if (tab >= 0) lastTab = tab;
  return (
    <motion.div
      initial={{ opacity: 0, x: dir * 48, y: dir === 0 ? 12 : 0, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
    >
      {children}
    </motion.div>
  );
}
