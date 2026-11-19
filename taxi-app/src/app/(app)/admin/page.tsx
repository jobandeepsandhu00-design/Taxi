import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, BookOpen, ClipboardCheck, FileQuestion, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { originShort } from "@/lib/labels";

export const metadata: Metadata = { title: "Administration" };

export default async function AdminHome() {
  const [users, students, byStatus, byOrigin, categories, unverifiedCats, examConfigs, unverifiedExam, attempts, answers] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.question.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.question.groupBy({ by: ["origin"], _count: { _all: true } }),
    prisma.category.count(),
    prisma.category.count({ where: { syllabusVerified: false, isActive: true } }),
    prisma.examConfig.count({ where: { isActive: true } }),
    prisma.examConfig.count({ where: { isActive: true, verified: false } }),
    prisma.examAttempt.count(),
    prisma.userAnswer.count(),
  ]);
  const count = (s: string) => byStatus.find((b) => b.status === s)?._count._all ?? 0;
  const tiles = [
    { href: "/admin/fragen", icon: FileQuestion, label: "Fragen", value: count("PUBLISHED") + count("DRAFT") + count("ARCHIVED"), sub: `${count("PUBLISHED")} veröffentlicht · ${count("DRAFT")} Entwürfe` },
    { href: "/admin/kategorien", icon: BookOpen, label: "Kategorien", value: categories, sub: `${unverifiedCats} Stoff unverifiziert` },
    { href: "/admin/pruefungen", icon: ClipboardCheck, label: "Prüfungskonfigurationen", value: examConfigs, sub: `${attempts} Prüfungsversuche` },
    { href: "/admin/benutzer", icon: Users, label: "Benutzer", value: users, sub: `${students} Lernende · ${answers} Antworten` },
  ];
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Administration" title="Übersicht" description="Fragenkatalog, Kategorien, Prüfungsregeln und Benutzer verwalten." />
      {(unverifiedCats > 0 || unverifiedExam > 0) && (
        <Alert variant="warning" title="Verifizierung offen">
          {unverifiedCats > 0 && <p>{unverifiedCats} aktive Kategorien sind noch nicht mit dem aktuellen offiziellen Prüfungsstoff abgeglichen.</p>}
          {unverifiedExam > 0 && <p>{unverifiedExam} aktive Prüfungskonfigurationen sind nicht als offiziell verifiziert markiert.</p>}
          <p className="mt-1">Bitte gegen die aktuellen Vorgaben der zuständigen Prüfungsstelle (Wien) prüfen und anschließend als verifiziert markieren.</p>
        </Alert>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href}>
            <Card className="h-full p-5 transition hover:shadow-md">
              <t.icon className="size-6 text-link" />
              <p className="mt-3 text-3xl font-extrabold text-navy">{t.value}</p>
              <p className="text-sm font-semibold text-navy">{t.label}</p>
              <p className="text-xs text-muted-foreground">{t.sub}</p>
            </Card>
          </Link>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="size-5 text-link" /> Herkunft der Fragen</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {(["OFFICIAL", "PRACTICE", "DEMO"] as const).map((o) => (
            <div key={o} className="rounded-xl bg-muted px-4 py-3">
              <p className="text-2xl font-extrabold text-navy">{byOrigin.find((b) => b.origin === o)?._count._all ?? 0}</p>
              <p className="text-xs text-muted-foreground">{originShort[o]}</p>
            </div>
          ))}
          <p className="flex basis-full items-start gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="size-4 shrink-0 text-warning" />
            „Offiziell“ darf nur für Fragen aus verifizierten offiziellen Quellen verwendet werden. Das System erzwingt eine verifizierte Quelle für offizielle Fragen.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
