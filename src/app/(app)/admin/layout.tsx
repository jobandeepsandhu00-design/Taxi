import { requireAdmin } from "@/lib/auth/session";
import { AdminTabs } from "./admin-tabs";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div>
      <AdminTabs />
      {children}
    </div>
  );
}
