import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 font-extrabold tracking-tight text-navy">
      <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-navy text-white shadow-md shadow-blue-600/30">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 17h14M6 17l1.2-5.2A2 2 0 0 1 9.15 10h5.7a2 2 0 0 1 1.95 1.8L18 17" />
          <path d="M10 7h4l.5 3h-5z" />
          <circle cx="8" cy="17.5" r="1.5" />
          <circle cx="16" cy="17.5" r="1.5" />
        </svg>
      </span>
      <span className="leading-none">
        <span className="block text-[15px]">TaxiPrüfung</span>
        <span className="block text-[11px] font-semibold text-muted-foreground">Österreich · Wien</span>
      </span>
    </Link>
  );
}
