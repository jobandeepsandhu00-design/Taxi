"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminNav } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

export function AdminTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Administration" className="-mx-4 mb-6 overflow-x-auto px-4 lg:hidden">
      <ul className="flex gap-1.5">
        {adminNav.map((item) => {
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link href={item.href} className={cn("block rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap", active ? "bg-primary text-primary-foreground" : "bg-foreground/8 text-foreground/75")}>
                {item.label.replace("Admin-", "")}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
