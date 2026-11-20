import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { routeDetail } from "@/server/routes";
import { RouteTrainer } from "./route-trainer";

export const metadata: Metadata = { title: "Route lernen" };

export default async function RoutePage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  const { slug } = await params;
  const d = await routeDetail(user.id, slug);
  if (!d) notFound();
  return <RouteTrainer route={d.route} initialProgress={d.progress} otherStreets={d.otherStreets} />;
}
