import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/jwt";

const PUBLIC_PATHS = ["/", "/login", "/registrieren", "/offline", "/impressum", "/datenschutz", "/api/health"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  // Cron-Endpunkte prüfen ihr eigenes Geheimnis (CRON_SECRET)
  // Audio-Worker (eigener Schlüssel) und lokale Audiodateien (Entwicklung) ohne Anmeldung
  const isPublic = PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/api/cron/") || pathname === "/api/audio/worker" || pathname === "/api/push/clicked" || pathname.startsWith("/api/audio/file/") || pathname.startsWith("/api/storage/");

  // Gäste dürfen zur Registrierung (Gastkonto in echtes Konto umwandeln)
  if (session && (pathname === "/login" || (pathname === "/registrieren" && !session.guest))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (isPublic) return NextResponse.next();

  if (!session) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  if ((pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) && session.role !== "ADMIN") {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|manifest.webmanifest|sw.js|robots.txt|api/media/).*)"],
};
