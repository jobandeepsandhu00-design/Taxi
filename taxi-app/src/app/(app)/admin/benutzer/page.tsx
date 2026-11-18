import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { UserTable } from "./user-table";

export const metadata: Metadata = { title: "Benutzer verwalten" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const admin = await requireAdmin();
  const { q } = await searchParams;
  const where: Prisma.UserWhereInput = q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {};
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      lastLoginAt: true,
      _count: { select: { answers: true, examAttempts: true } },
      examAttempts: { where: { passed: true }, select: { id: true }, take: 1 },
    },
  });
  return (
    <div>
      <PageHeader eyebrow="Administration" title="Benutzerverwaltung" description={`${users.length} Benutzer`} />
      <form className="mb-4 flex gap-2">
        <Input name="q" defaultValue={q} placeholder="Name oder E-Mail" aria-label="Benutzer suchen" />
        <Button type="submit" variant="secondary">Suchen</Button>
      </form>
      <UserTable
        currentUserId={admin.id}
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          isActive: u.isActive,
          createdAt: u.createdAt.toISOString(),
          lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
          answers: u._count.answers,
          exams: u._count.examAttempts,
          passedAny: u.examAttempts.length > 0,
        }))}
      />
    </div>
  );
}
