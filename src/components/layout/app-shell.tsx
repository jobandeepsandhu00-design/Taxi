"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LogOut, Menu, Shield, User, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/server/actions/auth";
import { adminNav, mainNav, mobileNav } from "./nav-items";

interface ShellUser {
  name: string;
  email: string;
  role: "STUDENT" | "ADMIN";
}

function useIsActive() {
  const pathname = usePathname();
  const search = useSearchParams();
  return (href: string) => {
    const [path, query] = href.split("?");
    if (query) return pathname === path && search.toString() === query;
    if (path === "/fragen" && search.get("merkliste")) return false;
    if (path === "/dashboard" || path === "/admin") return pathname === path;
    return pathname === path || pathname.startsWith(`${path}/`);
  };
}

function NavList({ items, onNavigate }: { items: typeof mainNav; onNavigate?: () => void }) {
  const isActive = useIsActive();
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                active ? "bg-primary text-white shadow-sm shadow-primary/30" : "text-slate-600 hover:bg-accent hover:text-navy",
              )}
            >
              <item.icon className="size-[18px]" />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SidebarContent({ user, onNavigate }: { user: ShellUser; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="px-2 pt-1">
        <Logo href="/dashboard" />
      </div>
      <nav aria-label="Hauptnavigation" className="flex-1 space-y-6 overflow-y-auto">
        <NavList items={mainNav} onNavigate={onNavigate} />
        {user.role === "ADMIN" && (
          <div>
            <p className="mb-2 px-3 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Administration</p>
            <NavList items={adminNav} onNavigate={onNavigate} />
          </div>
        )}
      </nav>
      <div className="rounded-2xl border bg-muted/60 p-3">
        <Link href="/profil" onClick={onNavigate} className="flex items-center gap-3 rounded-xl p-1 hover:bg-white">
          <span className="flex size-9 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-navy">{user.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{user.role === "ADMIN" ? "Administrator" : "Lernende/r"}</span>
          </span>
          <User className="size-4 text-muted-foreground" />
        </Link>
        <form action={logoutAction}>
          <button type="submit" className="mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white hover:text-destructive">
            <LogOut className="size-3.5" /> Abmelden
          </button>
        </form>
      </div>
    </div>
  );
}

export function AppShell({ user, children, disclaimer }: { user: ShellUser; children: React.ReactNode; disclaimer: string }) {
  const [open, setOpen] = useState(false);
  const isActive = useIsActive();
  return (
    <div className="min-h-dvh overflow-x-clip bg-[linear-gradient(180deg,#f7f9fe_0%,#ffffff_320px)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r bg-white/90 backdrop-blur lg:block">
        <SidebarContent user={user} />
      </aside>

      {/* Mobile Kopfzeile */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white/90 px-4 backdrop-blur lg:hidden">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-1">
          {user.role === "ADMIN" && (
            <Link href="/admin" className="rounded-lg p-2 text-slate-600 hover:bg-accent" aria-label="Administration">
              <Shield className="size-5" />
            </Link>
          )}
          <button type="button" onClick={() => setOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-accent" aria-label="Menü öffnen">
            <Menu className="size-5" />
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menü">
          <button type="button" className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label="Menü schließen" />
          <div className="animate-in slide-in-from-right absolute inset-y-0 right-0 w-[86%] max-w-xs bg-white shadow-2xl duration-200">
            <button type="button" onClick={() => setOpen(false)} className="absolute top-4 right-4 rounded-lg p-2 hover:bg-accent" aria-label="Menü schließen">
              <X className="size-5" />
            </button>
            <SidebarContent user={user} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-72">
        <main className="mx-auto w-full max-w-6xl px-4 pt-5 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-12">{children}</main>
        <footer className="mx-auto hidden max-w-6xl px-8 pb-8 text-xs leading-relaxed text-muted-foreground lg:block">{disclaimer}</footer>
      </div>

      {/* Mobile Tab-Leiste */}
      <nav aria-label="Schnellnavigation" className="fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <ul className="grid grid-cols-5">
          {mobileNav.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn("flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold", active ? "text-primary" : "text-slate-500")}
                >
                  <item.icon className={cn("size-5", active && "stroke-[2.5]")} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
