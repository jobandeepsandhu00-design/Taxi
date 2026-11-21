"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import { LogOut, Menu, Shield, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { haptic, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/server/actions/auth";
import { CoachFab } from "./coach-fab";
import { UebenTabs } from "./ueben-tabs";
import { adminNav, mainNav, mobileNav, pathInTab } from "./nav-items";

interface ShellUser {
  name: string;
  email: string;
  role: "STUDENT" | "ADMIN";
  isGuest?: boolean;
  avatar?: string | null;
}

function useIsActive() {
  const pathname = usePathname();
  const search = useSearchParams();
  return (href: string) => {
    const [path, query] = href.split("?");
    if (query) return pathname === path && search.toString() === query;
    if (path === "/fragen" && search.get("merkliste")) return false;
    if (path === "/dashboard" || path === "/admin") return pathname === path;
    if (path === "/ortskunde") return pathname === path || (pathname.startsWith("/ortskunde/") && !pathname.startsWith("/ortskunde/routen"));
    return pathname === path || pathname.startsWith(`${path}/`);
  };
}

function NavList({ items, pillId, onNavigate }: { items: typeof mainNav; pillId: string; onNavigate?: () => void }) {
  const isActive = useIsActive();
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={() => {
                haptic();
                onNavigate?.();
              }}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                active ? "text-primary-foreground" : "text-foreground/70 hover:bg-accent hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId={pillId}
                  className="absolute inset-0 rounded-xl bg-primary shadow-[0_6px_24px_-8px_var(--glow)]"
                  transition={spring}
                />
              )}
              <item.icon className="relative size-[18px]" />
              <span className="relative">{item.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SidebarContent({ user, pillPrefix, onNavigate }: { user: ShellUser; pillPrefix: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex items-center justify-between px-2 pt-1">
        <Logo href="/dashboard" />
        <ThemeToggle className="hidden lg:flex" />
      </div>
      <nav aria-label="Hauptnavigation" className="no-scrollbar flex-1 space-y-6 overflow-y-auto">
        <NavList items={mainNav} pillId={`${pillPrefix}-main`} onNavigate={onNavigate} />
        {user.role === "ADMIN" && (
          <div>
            <p className="mb-2 px-3 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Administration</p>
            <NavList items={adminNav} pillId={`${pillPrefix}-admin`} onNavigate={onNavigate} />
          </div>
        )}
      </nav>
      <div className="glass rounded-2xl p-3">
        <Link href="/profil" onClick={onNavigate} className="flex items-center gap-3 rounded-xl p-1 transition hover:bg-accent">
          <span className={cn("flex size-9 items-center justify-center rounded-full font-display text-sm font-bold", user.avatar ? "bg-primary/15 text-xl ring-1 ring-primary/50" : "bg-primary text-primary-foreground")}>
            {user.avatar ?? user.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-navy">{user.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{user.isGuest ? "Gastmodus" : user.role === "ADMIN" ? "Administrator" : "Lernende/r"}</span>
          </span>
          <User className="size-4 text-muted-foreground" />
        </Link>
        {user.isGuest && (
          <Link
            href="/registrieren"
            onClick={onNavigate}
            className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-primary px-2 py-2 text-xs font-bold text-primary-foreground transition active:scale-[0.97]"
          >
            Fortschritt sichern – Konto erstellen
          </Link>
        )}
        <form
          action={logoutAction}
          onSubmit={(e) => {
            if (user.isGuest && !window.confirm("Als Gast abmelden? Dein Gast-Fortschritt wird dabei gelöscht.")) e.preventDefault();
          }}
        >
          <button type="submit" className="mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-foreground/70 transition hover:bg-accent hover:text-destructive">
            <LogOut className="size-3.5" /> {user.isGuest ? "Gastmodus beenden" : "Abmelden"}
          </button>
        </form>
      </div>
    </div>
  );
}

/** Mobile Kopfzeile: wird beim Scrollen kompakter und bekommt einen Blur-Hintergrund. */
function MobileHeader({ user, onMenu }: { user: ShellUser; onMenu: () => void }) {
  const { scrollY } = useScroll();
  const backdrop = useTransform(scrollY, [0, 48], [0, 1]);
  const logoScale = useTransform(scrollY, [0, 48], [1, 0.88]);
  const shift = useTransform(scrollY, [0, 48], [0, -6]);
  return (
    <header className="pt-safe sticky top-0 z-30 lg:hidden">
      <motion.div style={{ opacity: backdrop }} className="absolute inset-0 border-b border-border bg-background/70 backdrop-blur-xl" />
      <motion.div style={{ y: shift }} className="relative flex h-16 items-center justify-between px-4">
        <motion.div style={{ scale: logoScale, originX: 0 }}>
          <Logo href="/dashboard" />
        </motion.div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {user.role === "ADMIN" && (
            <Link href="/admin" className="rounded-xl p-2.5 text-foreground/80 transition hover:bg-accent active:scale-95" aria-label="Administration">
              <Shield className="size-5" />
            </Link>
          )}
          <Link
            href="/profil"
            onClick={() => haptic()}
            aria-label={`Konto: ${user.name}${user.isGuest ? " (Gastmodus)" : ""}`}
            className="relative ml-0.5 flex size-11 items-center justify-center rounded-full transition active:scale-95"
          >
            <span
              className={cn(
                "flex size-9 items-center justify-center rounded-full font-display text-sm font-bold ring-2 ring-offset-2 ring-offset-background transition-shadow",
                user.avatar ? "bg-primary/15 text-xl ring-primary/60" : "bg-primary text-primary-foreground ring-primary/40",
              )}
            >
              {user.avatar ?? user.name.slice(0, 1).toUpperCase()}
            </span>
            {user.isGuest && <span className="absolute right-0.5 bottom-0.5 size-3 rounded-full border-2 border-background bg-warning" aria-hidden />}
          </Link>
          <button type="button" onClick={onMenu} className="rounded-xl p-2.5 text-foreground/80 transition hover:bg-accent active:scale-95" aria-label="Menü öffnen">
            <Menu className="size-5" />
          </button>
        </div>
      </motion.div>
    </header>
  );
}

/** Untere Tab-Leiste mit gleitender Pille (layoutId) und hüpfendem Icon. */
function BottomNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Schnellnavigation" className="pb-safe fixed inset-x-0 bottom-0 z-30 px-3 lg:hidden">
      <ul className="glass mx-auto mb-2 grid max-w-md grid-cols-5 rounded-2xl p-1.5 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.6)]">
        {mobileNav.map((item) => {
          const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathInTab(pathname, item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => haptic()}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-semibold transition-colors",
                  active ? "text-primary-foreground" : "text-foreground/60 active:text-foreground",
                )}
              >
                {active && <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-xl bg-primary" transition={spring} />}
                <motion.span
                  key={active ? "on" : "off"}
                  className="relative"
                  initial={active ? { y: 0, scale: 1 } : false}
                  animate={active ? { y: [0, -5, 0], scale: [1, 1.18, 1] } : { y: 0, scale: 1 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                >
                  <item.icon className={cn("size-5", active && "stroke-[2.4]")} />
                </motion.span>
                <span className="relative">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AppShell({ user, children, disclaimer }: { user: ShellUser; children: React.ReactNode; disclaimer: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-dvh overflow-x-clip">
      <aside className="glass fixed inset-y-0 left-0 z-30 hidden w-72 rounded-none border-y-0 border-l-0 lg:block">
        <SidebarContent user={user} pillPrefix="side" />
      </aside>

      <MobileHeader user={user} onMenu={() => setOpen(true)} />

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menü">
            <motion.button
              type="button"
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              aria-label="Menü schließen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="pt-safe absolute inset-y-0 right-0 w-[86%] max-w-xs border-l border-border bg-card-solid shadow-2xl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={spring}
            >
              <button type="button" onClick={() => setOpen(false)} className="absolute top-4 right-4 z-10 rounded-xl p-2 transition hover:bg-accent" aria-label="Menü schließen">
                <X className="size-5" />
              </button>
              <SidebarContent user={user} pillPrefix="drawer" onNavigate={() => setOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="lg:pl-72">
        <main className="mx-auto w-full max-w-6xl px-4 pt-3 pb-32 sm:px-6 lg:px-8 lg:pt-8 lg:pb-12">
          <UebenTabs />
          {children}
        </main>
        <footer className="mx-auto hidden max-w-6xl px-8 pb-8 text-xs leading-relaxed text-muted-foreground lg:block">{disclaimer}</footer>
      </div>

      <BottomNav />
      <CoachFab />
      <InstallPrompt />
    </div>
  );
}
