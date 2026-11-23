import { PrismaClient } from "@prisma/client";

/**
 * Supabase-Pooler: Im Sitzungsmodus (Port 5432) sind nur 15 Verbindungen erlaubt – bei mehreren
 * Serverless-Instanzen mit je mehreren Verbindungen ist das schnell voll („max clients reached“).
 * Zur Laufzeit daher den Transaktionsmodus (Port 6543, pgbouncer=true) mit wenigen Verbindungen
 * pro Instanz nutzen. Migrationen (prisma migrate) laufen weiter über die unveränderte DATABASE_URL.
 * Abschalten mit DB_POOL_MODE=session.
 */
function runtimeDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw || process.env.DB_POOL_MODE === "session") return raw;
  try {
    const url = new URL(raw);
    if (!url.hostname.endsWith(".pooler.supabase.com")) return raw;
    if (url.port === "5432" || url.port === "") url.port = "6543";
    url.searchParams.set("pgbouncer", "true");
    if (!url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", "5");
    if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", "20");
    return url.toString();
  } catch {
    return raw;
  }
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const url = runtimeDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    ...(url ? { datasources: { db: { url } } } : {}),
  });

// Auch in Produktion pro Instanz wiederverwenden (keine zusätzlichen Pools bei Hot-Reload/Modulduplikaten)
globalForPrisma.prisma = prisma;
