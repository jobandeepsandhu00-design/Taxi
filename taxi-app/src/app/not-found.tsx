import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-6xl font-extrabold text-blue-200">404</p>
      <h1 className="text-xl font-extrabold text-navy">Seite nicht gefunden</h1>
      <Button asChild>
        <Link href="/dashboard">Zur Übersicht</Link>
      </Button>
    </div>
  );
}
