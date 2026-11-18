import Link from "next/link";

export const metadata = { title: "Impressum" };

export default function ImpressumPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-5 py-12">
      <Link href="/" className="text-sm font-semibold text-primary">← Zurück</Link>
      <h1 className="text-3xl font-extrabold text-navy">Impressum</h1>
      <p className="text-muted-foreground">
        Angaben gemäß § 5 ECG und § 25 MedienG. <strong>Vom Betreiber vor dem Go-live zu ergänzen:</strong> Name/Firma,
        Anschrift, Kontakt, UID-Nummer, Firmenbuchnummer, Aufsichtsbehörde, Kammerzugehörigkeit.
      </p>
      <p className="text-muted-foreground">
        Diese Anwendung ist ein unabhängiges Lernangebot und steht in keiner Verbindung zu Behörden, Prüfungsstellen oder der
        Wirtschaftskammer. Übungs- und Demo-Fragen sind eigenständig erstellt und keine offiziellen Prüfungsfragen.
      </p>
    </div>
  );
}
