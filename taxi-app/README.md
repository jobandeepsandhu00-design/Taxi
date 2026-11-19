# TaxiPrüfung Österreich – Lern- und Quiz-App

Eine Lern-App für die Vorbereitung auf die Taxi-Prüfung in Österreich, zunächst für **Wien**. Sie umfasst strukturierte Lernkategorien, einen Fragenkatalog mit Erklärungen, Prüfungssimulationen, Fehlertraining, Lernkarten und eine Fortschrittsanalyse. Ein Admin-Panel dient zur Pflege der Inhalte.

> **Wichtig – Inhalte:** Alle mitgelieferten Fragen sind **Demo-Fragen**. Sie wurden eigenständig erstellt, sind **keine offiziellen Prüfungsfragen** und werden in der App entsprechend gekennzeichnet. Auch Kategorien, Quellen und Prüfungskonfigurationen sind bewusst **als „nicht verifiziert“ markiert**. Vor dem kommerziellen Einsatz müssen der Prüfungsstoff, die Prüfungsregeln (Dauer, Fragenanzahl, Bestehensgrenze) und alle rechtlichen Angaben mit den aktuellen offiziellen Vorgaben der zuständigen Prüfungsstelle in Wien und der geltenden Rechtslage (RIS) abgeglichen werden.

---

## Funktionen

| Bereich | Funktionen |
| --- | --- |
| **Dashboard** | Willkommen zurück, Gesamtfortschritt (Ring), beantwortete Fragen, Trefferquote, falsche Antworten, Lernserie, Lernzeit, Prüfungsbereitschaft, Countdown zum Prüfungstermin, Unfertige Sitzungen fortsetzen |
| **Lernmodus** | 10 Kategorien mit Einführung, Themen, Fragenanzahl, Fortschritt und Schwierigkeit; Filter nach Thema, Schwierigkeit oder nur noch nicht gelernten Fragen; kein Zeitlimit; sofortiges Feedback; Wiederholen |
| **Übungsquiz** | Zufällige Fragen aus gemischten Kategorien, Anzahl einstellbar, Endergebnis, falsche oder alle Fragen wiederholen |
| **Prüfungssimulation** | Konfigurierbare Dauer, Fragenanzahl und Bestehensgrenze; optional feste Fragenanzahl je Kategorie; Countdown (serverseitig abgesichert); Fragennavigation; Markieren zur Überprüfung; Antworten werden laufend gespeichert; Abgabe mit Bestätigung; automatische Abgabe bei Zeitablauf; Ergebnis mit Prozentwert, Bestanden/Nicht bestanden und Auswertung je Kategorie |
| **Fehlertraining** | Falsche Antworten werden automatisch gesammelt (auch aus Prüfungen); nach *n* richtigen Antworten in Folge (konfigurierbar) wird eine Frage aus der Liste entfernt; Verbesserungsquote |
| **Lernkarten** | Frage vorne, Antwort und Erklärung hinten, 3D-Flip-Animation, „Gelernt“ / „Nicht gelernt“, schwierige Karten werden wiederholt, Filter |
| **Fragensuche & Merkliste** | Volltextsuche, Filter nach Kategorie und Schwierigkeit, Fragen merken |
| **Fortschritt** | Tägliche Lernzeit, beantwortete Fragen (28 Tage), Trefferquote je Kategorie, schwächste Themen, Verlauf der wöchentlichen Trefferquote, Verlauf der Prüfungssimulationen |
| **Admin** | Fragen anlegen, bearbeiten, löschen, veröffentlichen/zurückziehen (auch mehrere gleichzeitig), Bild-Upload, Quellen und Fundstellen, Kategorien und Themen, CSV-Import mit Probelauf, CSV-Export, Prüfungskonfigurationen, Benutzer und Rollen, globale Einstellungen |
| **PWA** | Installierbar, Manifest, Service Worker mit Offline-Seite, mobile Tab-Leiste |

### So wird die Lösung geschützt

- Der Client erhält Fragen **ohne** `isCorrect` und ohne Erklärungen (`publicQuestionSelect`). Bewertet wird ausschließlich auf dem Server (`recordAnswer`). Die Lösung kommt erst nach dem Absenden zurück.
- Während einer Prüfungssimulation gibt es kein Feedback. Die Auswertung (`finalizeExam`) ist transaktional und idempotent.
- Die Eindeutigkeit der Fragen pro Prüfung erzwingt die Datenbank über `@@unique([examAttemptId, questionId])`.

### So bleiben offizielle und eigene Inhalte getrennt

- Jede Frage hat eine Herkunft: `OFFICIAL`, `PRACTICE` oder `DEMO`. In der Oberfläche erscheint sie als Badge („Offiziell“, „Übungsfrage“ oder „Demo-Frage“), und bei nicht offiziellen Fragen steht nach der Antwort ein Hinweis.
- Als `OFFICIAL` lässt sich eine Frage nur mit einer Quelle speichern oder veröffentlichen, die als **verifiziert** markiert ist. Das gilt im Formular, beim Veröffentlichen, bei Massenaktionen und beim CSV-Import.
- Kategorien haben die Felder `syllabusVerified` und `syllabusReference`, Prüfungskonfigurationen die Felder `verified` und `officialReference`. Die App zeigt Warnhinweise an, solange etwas nicht verifiziert ist.

---

## Architektur

```
src/
├── app/
│   ├── (auth)/             Login, Registrierung
│   ├── (app)/              geschützter Bereich (Layout mit Navigation)
│   │   ├── dashboard/      Übersicht
│   │   ├── lernen/         Kategorien + Kategorie-Detail
│   │   ├── sitzung/[id]/   Lern-/Quiz-/Fehler-Sitzung (gemeinsamer Runner)
│   │   ├── quiz/  fehler/  lernkarten/  fragen/  fortschritt/  profil/
│   │   ├── pruefung/       Übersicht, Prüfung [id], Ergebnis
│   │   └── admin/          Fragen, Kategorien, Quellen, Import, Prüfungen, Benutzer, Einstellungen
│   ├── api/                media (Bilder), admin/export, admin/template, health
│   ├── manifest.ts         PWA-Manifest
│   └── page.tsx            Landingpage
├── components/             UI-Bausteine (shadcn/ui-Stil), Quiz-Komponenten, Layout
├── lib/
│   ├── quiz-logic.ts       reine Geschäftslogik (Bewertung, Auswahl, Prüfungsergebnis, Fehlerliste, Serie, Bereitschaft)
│   ├── csv.ts              CSV-Import/-Export
│   ├── validation.ts       Zod-Schemas
│   ├── auth/               JWT-Session (jose), Passwort-Hashing (bcrypt)
│   └── dates.ts, settings.ts, rate-limit.ts, labels.ts
├── server/
│   ├── actions/            Server Actions (auth, learning, exam, admin)
│   ├── progress.ts         Antwort speichern + Fortschritt/Fehler/Aktivität/Serie
│   ├── exam.ts             Prüfungsauswertung, Ablauf
│   ├── questions.ts        sichere Fragenabfragen
│   └── stats.ts            Dashboard- und Analysedaten
└── middleware.ts           Zugriffsschutz (Login, Admin)
prisma/
├── schema.prisma           Datenmodell
├── migrations/             SQL-Migrationen
├── seed.ts                 idempotenter Seed
└── seed-data/              Kategorien, Quellen, Demo-Fragen
tests/
├── unit/                   Vitest (Logik, CSV, Validierung)
└── e2e/                    Playwright (komplette Abläufe Lernende + Admin)
```

**Technik:** Next.js 15 (App Router, Server Components, Server Actions), React 19, TypeScript, Tailwind CSS 4, UI-Komponenten im shadcn/ui-Stil (Radix Slot, CVA), PostgreSQL, Prisma 6, Zod, Recharts, jose, bcryptjs.

### Datenmodell (Auszug)

`Region` · `User` · `Category` · `Topic` · `Question` · `AnswerOption` · `QuestionSource` · `UserAnswer` · `QuizAttempt` · `ExamConfig` · `ExamAttempt` · `ExamResponse` · `FlashcardProgress` · `LearningStreak` · `UserProgress` · `MistakeEntry` · `Bookmark` · `DailyActivity` · `MediaFile` · `AppSetting`

### Sicherheit

- Passwörter werden mit bcrypt gehasht (Kostenfaktor 12).
- Die Sitzung ist ein signiertes JWT (HS256) in einem `httpOnly`-, `SameSite=Lax`- und in Produktion `Secure`-Cookie. Bei jedem Request wird geprüft, ob das Benutzerkonto noch aktiv ist.
- Die Middleware schützt alle App- und Admin-Routen. Zusätzlich prüft jede Server Action und jeder API-Endpunkt die Berechtigung (`requireUser` / `requireAdmin`).
- Login und Registrierung haben ein Rate Limit. Die Prüfung läuft in konstanter Zeit, damit sich nicht erkennen lässt, ob ein Konto existiert.
- Alle Eingaben werden mit Zod validiert. Bild-URLs sind nur mit `https://` oder als relative Pfade erlaubt.
- Beim Bild-Upload sind nur PNG, JPEG, WebP und GIF bis 3 MB erlaubt. Die Bilder liegen in der Datenbank und werden mit `nosniff` und einer restriktiven CSP ausgeliefert.
- Die App setzt Security-Header: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` und `Permissions-Policy`.

---

## Lokale Entwicklung

Voraussetzungen: Node.js 20 oder neuer, PostgreSQL 14 oder neuer.

```bash
npm install
cp .env.example .env          # DATABASE_URL und AUTH_SECRET setzen
npx prisma migrate deploy     # oder: npm run db:migrate
npm run db:seed
npm run dev                   # http://localhost:3000
```

**Zugänge nach dem Seed** (bitte sofort ändern):

| Rolle | E-Mail | Passwort |
| --- | --- | --- |
| Admin | `admin@taxi-pruefung.at` (bzw. `SEED_ADMIN_EMAIL`) | `SEED_ADMIN_PASSWORD` |
| Demo-Lernende | `demo@taxi-pruefung.at` | `Lernen!2026demo` (mit `SEED_DEMO_STUDENT=false` deaktivierbar) |

**Gastmodus:** Startseite, Login und Registrierung bieten „Als Gast testen“. Dabei wird ein eigenes, anonymes Konto nur für dieses Gerät angelegt (kein geteiltes Demo-Konto). Gäste können ihr Konto über „Fortschritt sichern“ jederzeit in ein echtes Konto umwandeln – der Lernfortschritt bleibt erhalten. Beim Abmelden wird ein Gastkonto gelöscht; ungenutzte Gastkonten werden nach 30 Tagen automatisch entfernt.

**Onboarding:** Neue Konten durchlaufen unter `/willkommen` drei Schritte (Prüfungsart, Prüfungstermin, Tagesziel).


### Qualitätssicherung

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint (0 Warnungen)
npm test            # Unit-Tests (Vitest)
npm run build
npm run test:e2e    # Playwright – benötigt gebaute App und geseedete DB
```

---

## Deployment (produktiv)

1. PostgreSQL bereitstellen und `DATABASE_URL` setzen.
2. `AUTH_SECRET` mit mindestens 32 zufälligen Zeichen setzen, z. B. `openssl rand -base64 48`.
3. `npm ci && npx prisma migrate deploy && npm run build && npm start` ausführen. Alternativ auf Vercel, Railway, Fly.io o. Ä. deployen, mit `prisma migrate deploy` als Release-Schritt.
4. Den Seed **einmalig** mit eigenem `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` und `SEED_DEMO_STUDENT=false` ausführen.
5. **Vor dem Go-live:**
   - Impressum (`/impressum`) und Datenschutzerklärung (`/datenschutz`) vervollständigen.
   - Prüfungsstoff und Prüfungsregeln mit der zuständigen Prüfungsstelle abgleichen und erst dann als verifiziert markieren.
   - Demo-Fragen archivieren oder durch geprüfte Übungsfragen ersetzen.
   - Quellen prüfen und als verifiziert markieren.
6. Der Health-Check ist unter `GET /api/health` erreichbar.

**Vercel:** Vercel führt automatisch das Skript `vercel-build` aus (`prisma migrate deploy` → `prisma db seed` → `next build`). Benötigte Umgebungsvariablen: `DATABASE_URL`, `AUTH_SECRET`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`. Hinweis: Der Seed läuft bei jedem Deployment und setzt die Demo-Fragen auf den Stand von `prisma/seed-data` zurück – für den Echtbetrieb das Seed aus `vercel-build` entfernen.

Hinweis zur Skalierung: Der Rate Limiter arbeitet im Speicher, also pro Instanz. Bei mehreren Instanzen durch Redis o. Ä. ersetzen.

---

## Inhalte pflegen

- **Einzelne Fragen** legst du im Admin-Bereich unter *Fragen → Neue Frage* an.
- **Massenimport** läuft über *Import / Export*. Dort gibt es die CSV-Vorlage, einen Probelauf mit Fehlerliste je Zeile und anschließend den Import. Zeilen mit einer bestehenden `id` werden aktualisiert. So kannst du exportieren, extern bearbeiten und wieder importieren.
- Das **CSV-Format** ist in `src/lib/csv.ts` dokumentiert. Trennzeichen ist `;` oder `,`. Die Spalte `richtig` enthält z. B. `B` oder `A,C` (bei Mehrfachauswahl).

## Erweiterung auf weitere Bundesländer

Das Modell `Region` ist bereits mit allen neun Bundesländern angelegt (nur Wien ist aktiv). `User`, `Category` und `ExamConfig` haben eine `regionId`. So gehst du für ein weiteres Bundesland vor:

1. Die Region aktivieren.
2. Eigene Kategorien anlegen, z. B. „Ortskenntnisse Graz“, und `regionId` setzen.
3. Eigene Prüfungskonfigurationen mit `regionId` anlegen.
4. Die Abfragen in `server/stats.ts`, `lernen/` und `pruefung/` nach der Region des Benutzers filtern. Die Felder dafür sind vorhanden, eine Regionsauswahl im Profil ist der nächste Schritt.

## Lizenz und Haftung

Unabhängiges Lernangebot, ohne Verbindung zu Behörden, Prüfungsstellen oder zur Wirtschaftskammer. Für die Richtigkeit der Inhalte wird keine Haftung übernommen. Maßgeblich sind ausschließlich die geltenden Rechtsvorschriften und die Vorgaben der zuständigen Prüfungsstelle.
