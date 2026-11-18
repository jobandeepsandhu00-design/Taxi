import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { getSettings } from "@/lib/settings";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Einstellungen" };

export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <div className="max-w-2xl">
      <PageHeader eyebrow="Administration" title="Einstellungen" description="Globale Lernregeln und rechtlicher Hinweistext." />
      <SettingsForm initial={settings} />
    </div>
  );
}
