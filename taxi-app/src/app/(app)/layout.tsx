import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { isDemoEmail } from "@/lib/demo";
import { DemoBanner } from "@/components/demo/demo-banner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([requireUser(), getSettings()]);
  return (
    <AppShell user={{ name: user.name, email: user.email, role: user.role }} disclaimer={settings.disclaimer}>
      {isDemoEmail(user.email) && <DemoBanner />}
      {children}
    </AppShell>
  );
}
