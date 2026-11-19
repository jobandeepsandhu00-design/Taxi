import Link from "next/link";

export const metadata = { title: "Datenschutz" };

export default function DatenschutzPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-5 py-12">
      <Link href="/" className="text-sm font-semibold text-link">← Zurück</Link>
      <h1 className="text-3xl font-extrabold text-navy">Datenschutzerklärung</h1>
      <p className="text-muted-foreground">
        <strong>Vorlage – vom Betreiber vor dem Go-live rechtlich prüfen und ergänzen (DSGVO, DSG).</strong>
      </p>
      <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
        <li>Gespeicherte Daten: Name, E-Mail-Adresse, Passwort (nur als bcrypt-Hash), Lernfortschritt, Antworten, Prüfungsergebnisse, Lernzeit.</li>
        <li>Zweck: Bereitstellung der Lernfunktionen und Fortschrittsanzeige (Art. 6 Abs. 1 lit. b DSGVO).</li>
        <li>Es wird ausschließlich ein technisch notwendiges Sitzungs-Cookie (httpOnly) verwendet; keine Tracking-Cookies.</li>
        <li>Betroffenenrechte: Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch, Beschwerde bei der Datenschutzbehörde.</li>
        <li>Verantwortlicher und Kontakt: vom Betreiber zu ergänzen.</li>
      </ul>
    </div>
  );
}
