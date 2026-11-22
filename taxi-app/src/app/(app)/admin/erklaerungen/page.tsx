import type { Metadata } from "next";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { questionsWithoutExplanation } from "@/server/explanations";
import { ImportExplanations } from "./import-explanations";

export const metadata: Metadata = { title: "Fehlende Erklärungen" };

export default async function MissingExplanationsPage() {
  const rows = await questionsWithoutExplanation();
  const opened = rows.filter((r) => r.hits > 0);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Fehlende Erklärungen"
        description="„Warum?“ zeigt Erklärung, Merkhilfe und Einfache Sprache direkt aus der Datenbank. Exportiere die Fragen ohne Erklärung, ergänze sie offline und importiere die CSV wieder."
        action={
          <Button asChild>
            <a href="/api/admin/erklaerungen">
              <Download /> CSV exportieren ({rows.length})
            </a>
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              Am häufigsten geöffnet ({opened.length} von {rows.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Alle Fragen haben eine Erklärung. 🎉</p>
            ) : (
              <div className="max-h-[32rem] overflow-y-auto rounded-xl border">
                <table className="w-full text-sm" data-testid="missing-table">
                  <thead className="sticky top-0 bg-muted text-left text-xs">
                    <tr>
                      <th className="p-2">Frage</th>
                      <th className="p-2">Kapitel</th>
                      <th className="p-2 text-right">„Warum?“</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.slice(0, 200).map((r) => (
                      <tr key={r.id}>
                        <td className="p-2">
                          <span className="font-mono text-[11px] text-muted-foreground">{r.id}</span>
                          <br />
                          {r.text}
                        </td>
                        <td className="p-2 text-xs text-muted-foreground">{r.category}</td>
                        <td className="p-2 text-right font-bold">{r.hits}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Erklärungen importieren</CardTitle>
          </CardHeader>
          <CardContent>
            <ImportExplanations />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
