import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDuelStateAction } from "@/server/actions/duel";
import { DuelRoom } from "./duel-room";

export const metadata: Metadata = { title: "Duell" };

export default async function DuelPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const state = await getDuelStateAction(code);
  if (!state) notFound();
  return <DuelRoom initial={state} />;
}
