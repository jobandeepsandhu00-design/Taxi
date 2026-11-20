import { expect, test, type Page } from "@playwright/test";

/**
 * End-to-End-Tests der wichtigsten Abläufe.
 * Voraussetzung: Datenbank migriert und geseedet, App gebaut (`npm run build`).
 */

const ADMIN = { email: process.env.SEED_ADMIN_EMAIL ?? "admin@taxi-pruefung.at", password: process.env.SEED_ADMIN_PASSWORD ?? "Admin!2026sicher" };
const uid = process.env.E2E_RUN_ID ?? Date.now().toString(36);
const STUDENT = { name: "Test Lernender", email: `lernender-${uid}@example.at`, password: "Sicher!2026test" };

async function login(page: Page, email: string, password: string) {
  await gotoSettled(page, "/login");
  await page.getByLabel("E-Mail-Adresse").fill(email);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.waitForURL("**/dashboard");
}

/** Durchläuft das 3-Schritte-Onboarding (Prüfung, Termin, Tagesziel). */
async function completeOnboarding(page: Page) {
  await page.waitForURL("**/willkommen");
  await settle(page);
  await page.getByRole("button", { name: "Taxilenker:in" }).click();
  await page.getByRole("button", { name: /Weiter/ }).click();
  await page.getByLabel("Mein Termin steht noch nicht fest").check();
  await page.getByRole("button", { name: /Weiter/ }).click();
  await page.getByRole("radio", { name: /20/ }).click();
  await page.getByRole("button", { name: /Los geht/ }).click();
  await page.waitForURL("**/dashboard");
}

/** Wartet, bis die Seite hydriert ist und Prefetches abgeschlossen sind (vermeidet Klick-Races direkt nach dem Laden). */
async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
}

async function gotoSettled(page: Page, url: string) {
  await page.goto(url);
  await settle(page);
}

/** Beantwortet die aktuell angezeigte Frage mit der ersten Option und gibt das Ergebnis zurück. */
async function answerFirstOption(page: Page) {
  await page.getByRole("radiogroup", { name: "Antwortmöglichkeiten" }).or(page.getByRole("group", { name: "Antwortmöglichkeiten" })).locator("button").first().click();
  await page.getByRole("button", { name: "Antwort prüfen" }).click();
  await expect(page.getByText(/^(Richtig!|Leider falsch)$/)).toBeVisible();
}

// Feier-Dialoge (Level-Aufstieg/Abzeichen) können jederzeit erscheinen – automatisch schließen
test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.locator('[aria-labelledby="celebration-title"]'), async (dialog) => {
    await dialog.getByRole("button").click();
  });
});

test.describe.serial("Lernende/r", () => {
  test("Schutz: nicht angemeldete Nutzer werden zum Login umgeleitet", async ({ page }) => {
    await gotoSettled(page, "/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  });

  test("Registrierung und Dashboard", async ({ page }) => {
    await gotoSettled(page, "/registrieren");
    await page.getByLabel("Name").fill(STUDENT.name);
    await page.getByLabel("E-Mail-Adresse").fill(STUDENT.email);
    await page.getByLabel("Passwort", { exact: true }).fill(STUDENT.password);
    await page.getByLabel("Passwort wiederholen").fill(STUDENT.password);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Registrieren" }).click();
    await completeOnboarding(page);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Test");
    await expect(page.getByText("Prüfungsreife")).toBeVisible();
    for (const label of ["Lernen starten", "Quiz starten", "Prüfungsmodus", "Falsche Antworten", "Lernkarten", "Mein Fortschritt"]) {
      await expect(page.getByRole("main").getByRole("link", { name: new RegExp(label) }).first()).toBeVisible();
    }
  });

  test("Falsche Anmeldedaten werden abgelehnt", async ({ page }) => {
    await gotoSettled(page, "/login");
    await page.getByLabel("E-Mail-Adresse").fill(STUDENT.email);
    await page.getByLabel("Passwort").fill("falschesPasswort1");
    await page.getByRole("button", { name: "Anmelden" }).click();
    await expect(page.getByText("E-Mail oder Passwort ist falsch.")).toBeVisible();
  });

  test("Lernmodus: Lösung erst nach Absenden, Feedback, Erklärung, Fortsetzen", async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password);
    await gotoSettled(page, "/lernen");
    await page.getByRole("link", { name: /Straßenverkehrsordnung/ }).click();
    await expect(page.getByRole("heading", { name: "Einführung" })).toBeVisible();
    await page.getByRole("button", { name: "Lernen starten" }).click();
    await page.waitForURL("**/sitzung/**");

    // Vor dem Absenden: keine Lösung im HTML
    const html = await page.content();
    expect(html).not.toContain("isCorrect");
    expect(html).not.toContain("correctOptionIds");
    await expect(page.getByText("Erklärung")).toHaveCount(0);

    await answerFirstOption(page);
    await expect(page.getByRole("heading", { name: "Erklärung" })).toBeVisible();
    await expect(page.getByText("Die Antworten im Einzelnen")).toBeVisible();

    // Neu laden: beantwortete Frage bleibt gespeichert, Sitzung setzt bei der nächsten offenen Frage fort
    await page.reload();
    await expect(page.getByText("✓ 1 richtig").or(page.getByText("✗ 1 falsch"))).toBeVisible();
    await expect(page.getByRole("button", { name: "Antwort prüfen" })).toBeVisible();
    await answerFirstOption(page);
    await expect(page.getByRole("button", { name: /Nächste Frage/ })).toBeVisible();

    // Zurück zur ersten Frage: Lösung wird aus der Datenbank wiederhergestellt
    await page.getByRole("button", { name: "Frage 1", exact: false }).first().click();
    await expect(page.getByRole("heading", { name: "Erklärung" })).toBeVisible();

    // Sitzung erscheint auf dem Dashboard als fortsetzbar
    await gotoSettled(page, "/dashboard");
    await expect(page.getByText("Lernmodus: Straßenverkehrsordnung (StVO)")).toBeVisible();
  });

  test("Übungsquiz mit Endergebnis und Wiederholung", async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password);
    await gotoSettled(page, "/quiz");
    await page.getByLabel("Anzahl Fragen").selectOption("10");
    await page.getByRole("button", { name: "Quiz starten" }).click();
    await page.waitForURL("**/sitzung/**");
    for (let i = 0; i < 10; i++) {
      await answerFirstOption(page);
      await page.getByRole("button", { name: /Nächste Frage|Ergebnis anzeigen/ }).click();
    }
    await expect(page.getByRole("heading", { name: "Sitzung abgeschlossen" })).toBeVisible();
    await expect(page.getByText("beantwortet", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Alle wiederholen/ })).toBeVisible();
  });

  test("Fehlertraining enthält falsch beantwortete Fragen", async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password);
    await gotoSettled(page, "/fehler");
    const open = Number(await page.locator("p", { hasText: /^\d+$/ }).first().textContent());
    if (open > 0) {
      await page.getByRole("button", { name: "Fehler wiederholen" }).click();
      await page.waitForURL("**/sitzung/**");
      await expect(page.getByText("Fehlertraining", { exact: true })).toBeVisible();
      await answerFirstOption(page);
    } else {
      await expect(page.getByText("Keine offenen Fehler")).toBeVisible();
    }
  });

  test("Prüfungssimulation: Navigation, Markieren, Speichern, Abgabe, Ergebnis", async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password);
    await gotoSettled(page, "/pruefung");
    const card = page.locator("div.rounded-2xl", { hasText: "Kurztest (15 Minuten)" }).last();
    await card.getByRole("button", { name: /Prüfung starten/ }).click();
    await page.waitForURL(/\/pruefung\/[^/]+$/);
    await expect(page.getByRole("timer")).toBeVisible();

    // Kein Feedback während der Prüfung
    await page.locator("[role=radiogroup] button, [role=group] button").first().click();
    await expect(page.getByText(/^(Richtig!|Leider falsch)$/)).toHaveCount(0);
    await page.getByRole("button", { name: "Zur Überprüfung markieren" }).click();
    await expect(page.getByRole("button", { name: "Markiert", exact: true })).toBeVisible();
    await page.getByRole("button", { name: /Weiter/ }).click();
    await page.locator("[role=radiogroup] button, [role=group] button").nth(1).click();
    await page.waitForTimeout(500);

    // Neu laden: Antworten und Markierung bleiben erhalten
    page.on("dialog", (d) => d.accept());
    await page.reload();
    await expect(page.getByText("2/15 beantwortet")).toBeVisible();
    await expect(page.getByText("1 markiert")).toBeVisible();

    await page.getByRole("complementary").getByRole("button", { name: /Prüfung abgeben/ }).click();
    await expect(page.getByRole("dialog", { name: "Prüfung abgeben?" })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Abgeben" }).click();
    await page.waitForURL("**/ergebnis");
    await expect(page.getByRole("heading", { name: /Bestanden!|Nicht bestanden/ })).toBeVisible();
    await expect(page.getByText("Ergebnis nach Kategorie")).toBeVisible();
    await expect(page.getByText(/von 15 Fragen richtig/)).toBeVisible();

    await gotoSettled(page, "/pruefung");
    await expect(page.getByText("Prüfungsverlauf")).toBeVisible();
    await expect(page.getByText(/\/15 richtig/)).toBeVisible();
  });

  test("Lernkarten: umdrehen und bewerten", async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password);
    await gotoSettled(page, "/lernkarten?filter=alle");
    await page.getByRole("button", { name: /Karte umdrehen: Antwort anzeigen/ }).click();
    await expect(page.getByRole("button", { name: /Gelernt/ })).toBeEnabled();
    await page.getByRole("button", { name: "Gelernt", exact: true }).click();
    await page.getByRole("button", { name: /Karte umdrehen: Antwort anzeigen/ }).click();
    await page.getByRole("button", { name: /Nicht gelernt/ }).click();
    await gotoSettled(page, "/lernkarten?filter=schwierig");
    await expect(page.getByRole("button", { name: /Karte umdrehen/ })).toBeVisible();
  });

  test("Fragensuche, Einzelfrage und Merkliste", async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password);
    await gotoSettled(page, "/fragen");
    await page.getByLabel("Suchbegriff").fill("Rettungsgasse");
    await page.getByRole("button", { name: "Suchen" }).click();
    await expect(page.getByText("1 Frage gefunden")).toBeVisible();
    await page.getByRole("link", { name: /Rettungsgasse/ }).click();
    await page.getByRole("button", { name: "Zur Merkliste hinzufügen" }).click();
    await expect(page.getByRole("button", { name: "Von der Merkliste entfernen" })).toBeVisible();
    // Übersetzungshilfe öffnet sich als Bottom-Sheet
    await page.getByRole("button", { name: "Übersetzungshilfe öffnen" }).click();
    await expect(page.getByRole("dialog", { name: "Übersetzungshilfe" })).toBeVisible();
    await page.getByRole("radio", { name: "Türkçe" }).click();
    await page.getByRole("dialog", { name: "Übersetzungshilfe" }).getByRole("button", { name: "Schließen" }).last().click();
    await expect(page.getByRole("dialog", { name: "Übersetzungshilfe" })).toHaveCount(0);
    await answerFirstOption(page);
    await gotoSettled(page, "/fragen?merkliste=1");
    await expect(page.getByRole("link", { name: /Rettungsgasse/ })).toBeVisible();
  });

  test("Fortschritt und Profil", async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password);
    await gotoSettled(page, "/fortschritt");
    await expect(page.getByRole("heading", { name: "Mein Fortschritt" })).toBeVisible();
    await expect(page.getByText("Trefferquote je Kategorie")).toBeVisible();
    await expect(page.locator(".recharts-wrapper").first()).toBeVisible();
    await expect(page.getByText("Lernkalender")).toBeVisible();
    await gotoSettled(page, "/lernplan");
    await expect(page.getByRole("heading", { name: "Dein Lernplan" })).toBeVisible();
    await expect(page.getByText("Heute").first()).toBeVisible();
    await gotoSettled(page, "/profil");
    await page.getByRole("radio", { name: "Riesenrad" }).click();
    await expect(page.getByRole("radio", { name: "Riesenrad" })).toHaveAttribute("aria-checked", "true");
    await page.getByRole("switch", { name: "Soundeffekte" }).click();
    await expect(page.getByRole("switch", { name: "Soundeffekte" })).toHaveAttribute("aria-checked", "false");
    await page.getByLabel("Geplanter Prüfungstermin").fill("2027-03-15");
    await page.getByRole("button", { name: "Speichern" }).click();
    await expect(page.getByText("Profil gespeichert.")).toBeVisible();
    await gotoSettled(page, "/dashboard");
    await expect(page.getByText(/bis zur Prüfung/)).toBeVisible();
    await expect(page.getByText("Lernserie")).toBeVisible();
  });

  test("Daily Challenge mit Rangliste", async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password);
    await gotoSettled(page, "/challenge");
    await page.getByRole("button", { name: "Challenge starten" }).click();
    await page.waitForURL("**/sitzung/**");
    for (let i = 0; i < 5; i++) {
      await answerFirstOption(page);
      await page.getByRole("button", { name: /Nächste Frage|Ergebnis anzeigen/ }).click();
    }
    await expect(page.getByRole("heading", { name: "Sitzung abgeschlossen" })).toBeVisible();
    await page.getByRole("link", { name: /Zur Rangliste/ }).click();
    await page.waitForURL("**/challenge");
    await expect(page.getByText("Heute geschafft")).toBeVisible();
    await expect(page.getByText("(du)")).toBeVisible();
  });

  test("Ortskunde-Karte: Tippen, Bezirke und Routen", async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password);
    await gotoSettled(page, "/ortskunde");
    const map = page.locator('[aria-label="Karte von Wien"]');
    await expect(map).toHaveAttribute("data-ready", "true", { timeout: 20_000 });
    const box = (await map.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.getByText(/^(Richtig! \+\d+ Punkte|Leider daneben)$/).first()).toBeVisible();
    await page.getByRole("tab", { name: "Bezirke" }).click();
    await expect(page.getByText(/von 23 Bezirken gemeistert/)).toBeVisible();
    await page.getByRole("tab", { name: "Routen" }).click();
    await page.getByRole("button", { name: "Route prüfen" }).click();
    await expect(page.getByText(/Perfekte Route|Nicht ganz/)).toBeVisible();
  });

  test("Offline-Paket herunterladen und üben", async ({ page }) => {
    await login(page, STUDENT.email, STUDENT.password);
    await gotoSettled(page, "/offline-lernen");
    await page.getByRole("button", { name: /Straßenverkehrsordnung/ }).click();
    await expect(page.getByRole("button", { name: "Üben" })).toBeVisible();
    await page.getByRole("button", { name: "Üben" }).click();
    await page.locator("button", { hasText: /^A/ }).first().click();
    await page.getByRole("button", { name: "Antwort prüfen" }).click();
    await expect(page.getByText(/^(Richtig!|Leider falsch)$/)).toBeVisible();
  });

  test("Duell: zwei Personen spielen live gegeneinander", async ({ browser }) => {
    const a = await browser.newContext();
    const b = await browser.newContext();
    const host = await a.newPage();
    const guest = await b.newPage();
    for (const p of [host, guest]) {
      await p.addLocatorHandler(p.locator('[aria-labelledby="celebration-title"]'), async (d) => {
        await d.getByRole("button").click();
      });
    }
    await login(host, ADMIN.email, ADMIN.password);
    await gotoSettled(host, "/duell");
    await host.getByRole("button", { name: "Duell erstellen" }).click();
    await host.waitForURL(/\/duell\/[A-Z0-9]{6}$/);
    const code = host.url().split("/").pop()!;
    await expect(host.getByText("Warte auf deinen Gegner")).toBeVisible();

    await login(guest, STUDENT.email, STUDENT.password);
    await gotoSettled(guest, "/duell");
    await guest.getByLabel("Duell-Code").fill(code);
    await guest.getByRole("button", { name: "Beitreten" }).click();
    await guest.waitForURL(`**/duell/${code}`);

    for (const p of [host, guest]) {
      for (let i = 0; i < 5; i++) {
        await expect(p.getByText(`Frage ${i + 1} von 5`)).toBeVisible({ timeout: 15_000 });
        await p.locator("main button", { hasText: /^A/ }).first().click();
      }
    }
    for (const p of [host, guest]) {
      await expect(p.getByRole("heading", { name: /gewonnen|verloren|Unentschieden/ })).toBeVisible({ timeout: 15_000 });
    }
    await a.close();
    await b.close();
  });

  test("Lernende haben keinen Zugriff auf die Administration", async ({ page, request }) => {
    await login(page, STUDENT.email, STUDENT.password);
    await gotoSettled(page, "/admin");
    await expect(page).toHaveURL(/\/dashboard$/);
    const res = await page.request.get("/api/admin/export");
    expect(res.status()).toBe(403);
    const anon = await request.get("/api/admin/export");
    expect([401, 403]).toContain(anon.status());
  });
});

test.describe.serial("Administration", () => {
  const questionText = `E2E-Testfrage ${uid}: Welche Farbe hat das Taxi-Dachschild im Test?`;

  test("Frage erstellen, veröffentlichen und für Lernende sichtbar", async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await gotoSettled(page, "/admin/fragen/neu");
    await page.getByLabel("Fragetext *").fill(questionText);
    await page.getByLabel("Antwort A", { exact: true }).fill("Gelb");
    await page.getByLabel("Antwort B", { exact: true }).fill("Blau");
    await page.getByLabel("Antwort C", { exact: true }).fill("Rot");
    await page.getByLabel("Antwort D", { exact: true }).fill("Grün");
    await page.getByLabel("Erklärung zu Antwort A").fill("Im Test ist Gelb richtig.");
    await page.getByLabel("Erklärung", { exact: true }).fill("Diese Frage dient nur dem automatisierten Test.");
    await page.getByLabel("Status").selectOption("PUBLISHED");
    await page.getByRole("button", { name: "Speichern & zur Liste" }).click();
    await page.waitForURL("**/admin/fragen");
    await settle(page);
    await page.getByLabel("Suche").fill(uid);
    await page.getByRole("button", { name: "Filtern" }).click();
    await page.waitForURL(/[?&]q=/);
    await expect(page.getByText("1 Fragen in der aktuellen Auswahl")).toBeVisible();
    await settle(page);
    await expect(page.getByRole("link", { name: questionText })).toBeVisible();

    // Offizielle Herkunft ohne verifizierte Quelle wird abgelehnt
    await page.getByRole("link", { name: questionText }).click();
    await page.waitForURL(/\/admin\/fragen\/c/);
    await page.getByLabel("Herkunft *").selectOption("OFFICIAL");
    await page.getByRole("button", { name: "Speichern", exact: true }).click();
    await expect(page.getByText(/verifizierte Quelle/).first()).toBeVisible();
  });

  test("Zurückziehen und Löschen einer Frage", async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await gotoSettled(page, `/admin/fragen?q=${uid}`);
    await page.getByRole("button", { name: "Veröffentlichung zurückziehen" }).click();
    await expect(page.getByRole("button", { name: "Veröffentlichen" })).toBeVisible();
    page.on("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Löschen" }).click();
    await expect(page.getByText("Keine Fragen gefunden.")).toBeVisible({ timeout: 30_000 });
  });

  test("CSV: Vorlage, Probelauf, Import und Export", async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    const template = await page.request.get("/api/admin/template");
    expect(template.status()).toBe(200);
    const csv = (await template.text()).replace("Beispiel: Welche", `CSV-${uid}: Welche`);
    await gotoSettled(page, "/admin/import"); // Hydrierung abwarten, damit onChange registriert ist
    await page.locator("input[type=file]").setInputFiles({ name: "fragen.csv", mimeType: "text/csv", buffer: Buffer.from(csv, "utf-8") });
    await page.getByRole("button", { name: /Datei prüfen/ }).click();
    await expect(page.getByText("Ergebnis des Probelaufs")).toBeVisible();
    await expect(page.getByText(/1 neue Fragen/)).toBeVisible();
    await page.getByRole("button", { name: "Jetzt importieren" }).click();
    await expect(page.getByText("Import abgeschlossen")).toBeVisible();

    const exported = await page.request.get("/api/admin/export");
    expect(exported.headers()["content-type"]).toContain("text/csv");
    expect(await exported.text()).toContain(`CSV-${uid}`);
  });

  test("Prüfungskonfiguration und Einstellungen bearbeiten", async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await gotoSettled(page, "/admin/pruefungen");
    await page.getByRole("button", { name: "Neue Konfiguration" }).click();
    await page.getByLabel("Name *").fill(`E2E-Prüfung ${uid}`);
    await page.getByLabel("Dauer (Minuten) *").fill("5");
    await page.getByLabel("Anzahl Fragen *").fill("5");
    await page.getByRole("button", { name: "Speichern" }).click();
    const configCard = page.locator("div.rounded-2xl", { hasText: `E2E-Prüfung ${uid}` }).last();
    await expect(configCard).toBeVisible();
    await expect(configCard.getByText("5 Min. · 5 Fragen · Bestehen ab 70 %")).toBeVisible();

    await gotoSettled(page, "/admin/einstellungen");
    await page.getByLabel(/richtige Antworten in Folge/).fill("3");
    await page.getByRole("button", { name: "Einstellungen speichern" }).click();
    await expect(page.getByText("Einstellungen gespeichert.")).toBeVisible();
    await page.getByLabel(/richtige Antworten in Folge/).fill("2");
    await page.getByRole("button", { name: "Einstellungen speichern" }).click();
  });

  test("Kategorien, Quellen und Benutzer verwalten", async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await gotoSettled(page, "/admin/kategorien");
    await expect(page.getByText("Wiener Ortskenntnisse")).toBeVisible();
    await page.getByRole("button", { name: "Neue Kategorie" }).click();
    await page.getByLabel("Name *").fill(`Testkategorie ${uid}`);
    await page.getByLabel("Slug (URL) *").fill(`test-${uid}`);
    await page.getByLabel("Kurzbeschreibung *").fill("Nur für Tests");
    await page.getByLabel("Einführung *").fill("Einführungstext für Tests.");
    await page.getByRole("button", { name: "Kategorie speichern" }).click();
    await expect(page.getByText(`Testkategorie ${uid}`)).toBeVisible();
    page.on("dialog", (d) => d.accept());
    await page.locator("div", { hasText: `Testkategorie ${uid}` }).getByRole("button", { name: "Kategorie löschen" }).last().click();
    await expect(page.getByText(`Testkategorie ${uid}`)).toHaveCount(0);

    await gotoSettled(page, "/admin/quellen");
    await expect(page.getByText("Straßenverkehrsordnung 1960 (StVO)")).toBeVisible();

    await gotoSettled(page, `/admin/benutzer?q=${encodeURIComponent(STUDENT.email)}`);
    await expect(page.getByText(STUDENT.email)).toBeVisible();
  });
});

test("PWA: Manifest und Service Worker sind erreichbar", async ({ request }) => {
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.status()).toBe(200);
  const json = await manifest.json();
  expect(json.lang).toBe("de-AT");
  expect(json.icons.length).toBeGreaterThan(0);
  expect((await request.get("/sw.js")).status()).toBe(200);
  expect((await request.get("/api/health")).status()).toBe(200);
});

test.describe("Gastmodus", () => {
  test("Als Gast testen: eigenes Konto, Onboarding, Sperren und Umwandlung in echtes Konto", async ({ page }) => {
    await gotoSettled(page, "/login");
    await page.getByRole("button", { name: /Als Gast testen/ }).click();
    await completeOnboarding(page);
    await expect(page.getByText("Gastmodus").first()).toBeVisible();

    await gotoSettled(page, "/profil");
    const pwForm = page.locator("form").filter({ has: page.getByLabel("Aktuelles Passwort") });
    await pwForm.getByLabel("Aktuelles Passwort").fill("egal");
    await pwForm.getByLabel("Neues Passwort", { exact: true }).fill("Neu!2026passwort");
    await pwForm.getByLabel("Neues Passwort wiederholen").fill("Neu!2026passwort");
    await pwForm.getByRole("button").click();
    await expect(page.getByText(/Im Gastmodus nicht möglich/)).toBeVisible();

    await gotoSettled(page, "/registrieren");
    await expect(page.getByRole("heading", { name: "Fortschritt sichern" })).toBeVisible();
    await page.getByLabel("Name").fill("Ehemaliger Gast");
    await page.getByLabel("E-Mail-Adresse").fill(`gast-upgrade-${uid}@example.at`);
    await page.getByLabel("Passwort", { exact: true }).fill("Sicher!2026gast");
    await page.getByLabel("Passwort wiederholen").fill("Sicher!2026gast");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: /Konto erstellen/ }).click();
    await page.waitForURL("**/dashboard");
    await expect(page.getByText("Ehemaliger").first()).toBeVisible();
    await expect(page.getByText("Gastmodus")).toHaveCount(0);
  });
});
