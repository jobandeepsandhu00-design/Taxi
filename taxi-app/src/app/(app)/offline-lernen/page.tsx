import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { OfflinePractice } from "./offline-practice";

export const metadata: Metadata = { title: "Offline lernen" };

export default async function OfflineLearnPage() {
  await requireUser();
  const categories = await prisma.category.findMany({ where: { isActive: true }, orderBy: { order: "asc" }, select: { slug: true, name: true } });
  return (
    <div className="mx-auto max-w-2xl space-y-2">
      <PageHeader eyebrow="Ohne Internet" title="Offline lernen" description="Lade Fragenpakete aufs Gerät und übe auch in der U-Bahn ohne Netz. Offline-Antworten fließen nicht in deine Statistik ein." />
      <OfflinePractice categories={categories} />
    </div>
  );
}
