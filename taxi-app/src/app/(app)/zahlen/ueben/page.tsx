import type { Metadata } from "next";
import { NumberDrill } from "./number-drill";

export const metadata: Metadata = { title: "Zahlen üben" };

export default async function DrillPage({ searchParams }: { searchParams: Promise<{ typ?: string }> }) {
  const { typ } = await searchParams;
  const type = typ === "eingabe" || typ === "blitz" ? typ : "auswahl";
  return <NumberDrill type={type} />;
}
