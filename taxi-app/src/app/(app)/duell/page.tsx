import type { Metadata } from "next";
import Link from "next/link";
import { Swords } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { createDuelAction, joinDuelAction } from "@/server/actions/duel";

export const metadata: Metadata = { title: "Duell" };

const statusLabel = { WAITING: "wartet", ACTIVE: "läuft", FINISHED: "beendet", CANCELLED: "abgebrochen" } as const;

export default async function DuelLobby({ searchParams }: { searchParams: Promise<{ fehler?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const recent = await prisma.duel.findMany({
    where: { OR: [{ hostId: user.id }, { guestId: user.id }], status: { not: "CANCELLED" } },
    orderBy: { createdAt: "desc" },
    take: 6,
    include: { host: { select: { name: true } }, guest: { select: { name: true } } },
  });
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader eyebrow="1 gegen 1" title="Duell-Modus" description="Fordere eine Freundin oder einen Freund heraus: 5 Fragen, gleichzeitig, live. Mehr Treffer gewinnen – bei Gleichstand die schnellere Zeit." />
      {sp.fehler === "code" && <Alert variant="error">Dieser Duell-Code ist ungültig oder abgelaufen.</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="panel-night flex flex-col items-center gap-3 p-6 text-center">
          <Swords className="size-10 text-primary" />
          <p className="font-display text-lg font-bold text-white">Neues Duell</p>
          <p className="text-sm text-white/70">Du bekommst einen Code zum Teilen.</p>
          <form action={createDuelAction}>
            <Button type="submit" size="lg">
              Duell erstellen
            </Button>
          </form>
        </Card>
        <Card className="p-6">
          <form action={joinDuelAction} className="space-y-3">
            <p className="font-display text-lg font-bold text-navy">Beitreten</p>
            <div className="space-y-1.5">
              <Label htmlFor="code">Duell-Code</Label>
              <Input id="code" name="code" placeholder="z. B. K7QX2M" maxLength={6} autoCapitalize="characters" autoComplete="off" className="text-center font-display text-xl tracking-[0.3em] uppercase" required />
            </div>
            <Button type="submit" variant="outline" className="w-full">
              Beitreten
            </Button>
          </form>
        </Card>
      </div>
      {recent.length > 0 && (
        <Card className="p-5">
          <h2 className="font-bold text-navy">Deine letzten Duelle</h2>
          <ul className="mt-3 divide-y divide-border text-sm">
            {recent.map((d) => (
              <li key={d.id}>
                <Link href={`/duell/${d.code}`} className="flex items-center justify-between py-2.5 hover:text-link">
                  <span>
                    <span className="font-mono font-bold">{d.code}</span> · {d.host.name.split(" ")[0]} vs. {d.guest?.name.split(" ")[0] ?? "…"}
                  </span>
                  <span className="text-xs text-muted-foreground">{statusLabel[d.status]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
