import type { Metadata } from "next";
import { Clock, Trophy } from "lucide-react";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { avatarEmoji } from "@/lib/avatars";
import { DAILY_COUNT, publicName, rankResults } from "@/lib/challenge";
import { prisma } from "@/lib/db";
import { dayKey, dayKeyToDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { startDailyChallengeAction } from "@/server/actions/learning";
import { NextChallengeCountdown } from "./countdown";

export const metadata: Metadata = { title: "Daily Challenge" };

function fmt(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

export default async function ChallengePage() {
  const user = await requireUser();
  const today = dayKeyToDate(dayKey());
  const [rows, history] = await Promise.all([
    prisma.dailyChallengeResult.findMany({ where: { day: today }, include: { user: { select: { id: true, name: true, isGuest: true, avatar: true } } }, take: 500 }),
    prisma.dailyChallengeResult.findMany({ where: { userId: user.id }, orderBy: { day: "desc" }, take: 7 }),
  ]);
  const ranked = rankResults(rows.map((r) => ({ ...r, durationSec: r.durationSec })));
  const mine = ranked.find((r) => r.userId === user.id);
  const top = ranked.slice(0, 20);
  const podium = [ranked[1], ranked[0], ranked[2]];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Jeden Tag neu" title="Daily Challenge" description={`${DAILY_COUNT} Fragen – für alle gleich. Ein Versuch pro Tag, die Schnellsten mit den meisten Treffern führen.`} />

      <Card className="panel-night p-6">
        {mine ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-xs font-bold tracking-[0.25em] text-primary uppercase">Heute geschafft</p>
            <p className="font-display text-5xl font-bold text-white">
              <AnimatedNumber value={mine.correct} />/{mine.total}
            </p>
            <p className="text-sm text-white/70">
              Platz {mine.rank} von {ranked.length} · Zeit {fmt(mine.durationSec)}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <Trophy className="size-10 text-primary" />
            <p className="font-display text-2xl font-bold text-white">Die heutige Challenge wartet</p>
            <p className="text-sm text-white/70">{ranked.length} {ranked.length === 1 ? "Person hat" : "Personen haben"} heute schon gespielt.</p>
            <form action={startDailyChallengeAction}>
              <Button type="submit" size="lg">
                Challenge starten
              </Button>
            </form>
          </div>
        )}
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-white/60">
          <Clock className="size-3.5" /> Nächste Challenge in <NextChallengeCountdown />
        </p>
      </Card>

      {ranked.length > 0 && (
        <section aria-label="Siegertreppchen" className="grid grid-cols-3 items-end gap-3">
          {podium.map((r, i) => {
            if (!r) return <div key={i} />;
            const place = r.rank;
            const h = place === 1 ? "h-28" : place === 2 ? "h-20" : "h-14";
            return (
              <div key={r.id} className="flex flex-col items-center gap-1 text-center">
                <span className="text-3xl">{avatarEmoji(r.user.avatar) ?? "🚕"}</span>
                <span className="max-w-full truncate text-xs font-bold text-navy">{publicName(r.user.name, r.user.isGuest)}</span>
                <span className="text-[11px] text-muted-foreground">
                  {r.correct}/{r.total} · {fmt(r.durationSec)}
                </span>
                <div className={cn("flex w-full origin-bottom animate-[podium_0.7s_cubic-bezier(0.2,1.2,0.4,1)_both] items-start justify-center rounded-t-2xl pt-2 font-display text-2xl font-bold", h, place === 1 ? "bg-primary text-primary-foreground" : "glass text-navy")} style={{ animationDelay: `${i * 0.12}s` }}>
                  {place}
                </div>
              </div>
            );
          })}
        </section>
      )}

      <Card className="p-5">
        <h2 className="font-bold text-navy">Rangliste heute</h2>
        {top.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Noch niemand – sei die oder der Erste! 🚕</p>
        ) : (
          <Stagger as="ul" className="mt-3 space-y-2">
            {top.map((r) => (
              <StaggerItem as="li" key={r.id} className={cn("flex items-center gap-3 rounded-xl px-3 py-2", r.userId === user.id ? "bg-primary/12 ring-1 ring-primary/40" : "bg-muted")}>
                <span className="w-6 text-center font-display font-bold text-navy">{r.rank}</span>
                <span className="text-xl">{avatarEmoji(r.user.avatar) ?? "🚕"}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-navy">
                  {publicName(r.user.name, r.user.isGuest)}
                  {r.userId === user.id && <span className="text-link"> (du)</span>}
                </span>
                <span className="text-sm font-bold text-navy tabular-nums">
                  {r.correct}/{r.total}
                </span>
                <span className="w-12 text-right text-xs text-muted-foreground tabular-nums">{fmt(r.durationSec)}</span>
              </StaggerItem>
            ))}
          </Stagger>
        )}
        <p className="mt-3 text-[11px] text-muted-foreground">Angezeigt werden nur Vorname und Initiale.</p>
      </Card>

      {history.length > 0 && (
        <Card className="p-5">
          <h2 className="font-bold text-navy">Deine letzten Challenges</h2>
          <ul className="mt-3 flex gap-2 overflow-x-auto">
            {history.map((h) => (
              <li key={h.id} className="glass min-w-16 rounded-xl p-2 text-center">
                <p className="text-[11px] text-muted-foreground">{h.day.toISOString().slice(8, 10)}.{h.day.toISOString().slice(5, 7)}.</p>
                <p className="font-display font-bold text-navy">
                  {h.correct}/{h.total}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
