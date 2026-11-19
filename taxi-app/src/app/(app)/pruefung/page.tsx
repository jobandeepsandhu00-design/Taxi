import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Clock, ListChecks, ShieldAlert, Target, XCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { startExamAction } from "@/server/actions/exam";
import { expireOverdueExams } from "@/server/exam";

export const metadata: Metadata = { title: "Prüfungsmodus" };

const errors: Record<string, string> = {
  konfiguration: "Diese Prüfungskonfiguration ist nicht verfügbar.",
  "keine-fragen": "Für diese Prüfung sind derzeit keine veröffentlichten Fragen vorhanden.",
};

export default async function ExamOverviewPage({ searchParams }: { searchParams: Promise<{ fehler?: string }> }) {
  const user = await requireUser();
  const { fehler } = await searchParams;
  await expireOverdueExams(user.id);
  const [configs, history, open] = await Promise.all([
    prisma.examConfig.findMany({ where: { isActive: true }, orderBy: [{ isDefault: "desc" }, { name: "asc" }] }),
    prisma.examAttempt.findMany({
      where: { userId: user.id, status: { in: ["SUBMITTED", "EXPIRED"] } },
      orderBy: { startedAt: "desc" },
      take: 20,
      include: { examConfig: { select: { name: true } } },
    }),
    prisma.examAttempt.findMany({ where: { userId: user.id, status: "IN_PROGRESS" }, select: { id: true, examConfigId: true } }),
  ]);
  const openByConfig = new Map(open.map((o) => [o.examConfigId, o.id]));
  const passedCount = history.filter((h) => h.passed).length;

  return (
    <div>
      <PageHeader eyebrow="Prüfungsmodus" title="Prüfungssimulation" description="Realistische Simulation: Zeitlimit, kein Feedback während der Prüfung, Fragen markieren und am Ende auswerten." />
      {fehler && errors[fehler] && <Alert variant="error" className="mb-4">{errors[fehler]}</Alert>}

      <Alert variant="warning" className="mb-6" title="Wichtiger Hinweis zu den Prüfungsregeln">
        Dauer, Fragenanzahl und Bestehensgrenze sind konfigurierbar. Nicht als „verifiziert“ gekennzeichnete Konfigurationen sind
        Übungsvorgaben und entsprechen nicht zwingend der offiziellen Prüfungsordnung. Bitte informiere dich bei der zuständigen
        Prüfungsstelle über die aktuell gültigen Regeln.
      </Alert>

      {configs.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Keine Prüfung konfiguriert" description="Ein Administrator muss zuerst eine Prüfungskonfiguration anlegen." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {configs.map((c) => (
            <Card key={c.id} className="flex flex-col overflow-hidden">
              <div className="panel-night p-5 text-white">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-extrabold">{c.name}</h2>
                  {c.verified ? (
                    <Badge variant="success"><CheckCircle2 className="size-3" /> Verifiziert</Badge>
                  ) : (
                    <Badge variant="warning"><ShieldAlert className="size-3" /> Übungsvorgabe</Badge>
                  )}
                </div>
                {c.description && <p className="mt-1 text-sm text-white/80">{c.description}</p>}
              </div>
              <CardContent className="flex flex-1 flex-col gap-4 pt-5">
                <dl className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-muted p-3"><Clock className="mx-auto size-4 text-link" /><dd className="mt-1 font-extrabold text-navy">{c.durationMinutes} Min.</dd><dt className="text-[11px] text-muted-foreground">Dauer</dt></div>
                  <div className="rounded-xl bg-muted p-3"><ListChecks className="mx-auto size-4 text-link" /><dd className="mt-1 font-extrabold text-navy">{c.questionCount}</dd><dt className="text-[11px] text-muted-foreground">Fragen</dt></div>
                  <div className="rounded-xl bg-muted p-3"><Target className="mx-auto size-4 text-link" /><dd className="mt-1 font-extrabold text-navy">{c.passPercentage} %</dd><dt className="text-[11px] text-muted-foreground">zum Bestehen</dt></div>
                </dl>
                {c.officialReference && <p className="text-xs text-muted-foreground">Grundlage: {c.officialReference}</p>}
                <form action={startExamAction} className="mt-auto">
                  <input type="hidden" name="examConfigId" value={c.id} />
                  <SubmitButton size="lg" variant={openByConfig.has(c.id) ? "secondary" : "navy"} className="w-full" pendingText="Prüfung wird vorbereitet…">
                    <ClipboardCheck /> {openByConfig.has(c.id) ? "Laufende Prüfung fortsetzen" : "Prüfung starten"}
                  </SubmitButton>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-8">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Prüfungsverlauf</CardTitle>
          {history.length > 0 && <span className="text-sm text-muted-foreground">{passedCount} von {history.length} bestanden</span>}
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Prüfungssimulation abgeschlossen.</p>
          ) : (
            <ul className="divide-y">
              {history.map((h) => (
                <li key={h.id}>
                  <Link href={`/pruefung/${h.id}/ergebnis`} className="flex items-center gap-3 py-3 hover:bg-muted/40">
                    {h.passed ? <CheckCircle2 className="size-5 text-success" /> : <XCircle className="size-5 text-destructive" />}
                    <div className="flex-1">
                      <p className="text-sm font-bold text-navy">{h.examConfig.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(h.startedAt, true)} · {h.correctCount}/{h.totalCount} richtig
                        {h.status === "EXPIRED" && (
                          <span className="ml-1 inline-flex items-center gap-0.5 text-warning"><AlertTriangle className="size-3" /> Zeit abgelaufen</span>
                        )}
                      </p>
                    </div>
                    <span className={`text-lg font-extrabold ${h.passed ? "text-success" : "text-destructive"}`}>{h.scorePercent?.toLocaleString("de-AT")} %</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
