import Link from "next/link";

export function TaxiGlyph({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 17h14M6 17l1.2-5.2A2 2 0 0 1 9.15 10h5.7a2 2 0 0 1 1.95 1.8L18 17" />
      <path d="M10 7h4l.5 3h-5z" />
      <circle cx="8" cy="17.5" r="1.5" />
      <circle cx="16" cy="17.5" r="1.5" />
    </svg>
  );
}

export function Logo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="group flex items-center gap-2.5 font-bold tracking-tight text-navy" aria-label="TaxiPrüfung – Startseite">
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_24px_-4px_rgba(255,196,0,0.6)] transition-transform duration-300 group-hover:-rotate-6 group-active:scale-95">
        <TaxiGlyph />
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-[16px]">
            Taxi<span className="text-link">Prüfung</span>
          </span>
          <span className="block text-[11px] font-medium text-muted-foreground">Österreich · Wien</span>
        </span>
      )}
    </Link>
  );
}
