import { expect, test, type Page } from "@playwright/test";

/** Mündliche Prüfung im Fake-Modus (COACH_FAKE=1): Transkript = Musterantwort, Bewertung per Wortabgleich. */

const ADMIN = { email: process.env.SEED_ADMIN_EMAIL ?? "admin@taxi-pruefung.at", password: process.env.SEED_ADMIN_PASSWORD ?? "Admin!2026sicher" };

async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
}

async function guest(page: Page) {
  await page.goto("/login");
  await settle(page);
  await page.getByRole("button", { name: /Als Gast testen/ }).click();
  await page.waitForURL("**/willkommen");
  await settle(page);
  await page.getByRole("button", { name: "Taxilenker:in" }).click();
  await page.getByRole("button", { name: /Weiter/ }).click();
  await page.getByLabel("Mein Termin steht noch nicht fest").check();
  await page.getByRole("button", { name: /Weiter/ }).click();
  await page.getByRole("radio", { name: /20/ }).click();
  await page.getByRole("button", { name: /Los geht/ }).click();
  await page.waitForURL("**/dashboard");
  await settle(page);
}

async function typeAnswer(page: Page, text: string) {
  const box = page.getByLabel("Deine Antwort");
  if (!(await box.isVisible())) await page.getByRole("button", { name: "Antwort tippen" }).click();
  await box.fill(text);
  await page.getByRole("button", { name: "Antwort abgeben" }).click();
}

test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.locator('[aria-labelledby="celebration-title"]'), async (dialog) => {
    await dialog.getByRole("button").click();
  });
});

test("Üben (Gast): Datenschutz, getippte Antwort, Feedback, Tageslimit, Bericht", async ({ page }) => {
  await guest(page);
  await page.getByTestId("home-oral").click();
  await page.waitForURL("**/muendlich");
  await settle(page);
  await expect(page.getByText("Deine Aufnahme wird nur zur Auswertung verwendet und nach 30 Tagen gelöscht.")).toBeVisible();
  await expect(page.getByText("3 von 3 Fragen heute frei")).toBeVisible();
  await expect(page.getByTestId("oral-start-pruefung")).toBeDisabled();
  await page.getByLabel("Aufnahmen nicht speichern (nur das Transkript)").check();
  await page.getByTestId("oral-start-ueben").click();
  await page.waitForURL(/\/muendlich\/[^/]+$/);
  await expect(page.getByTestId("oral-mode")).toBeVisible();
  await expect(page.getByText("Mündlich · Frage 1/3")).toBeVisible();
  await expect(page.getByTestId("oral-question")).toBeVisible();
  await expect(page.getByTestId("oral-mic")).toBeVisible();
  await expect(page.getByText("Ungeprüft")).toBeVisible();

  // 1) Falsche Antwort → Feedback mit Checkliste und Musterantwort
  await typeAnswer(page, "Keine Ahnung, ehrlich.");
  const fb = page.getByTestId("oral-feedback");
  await expect(fb).toBeVisible();
  await expect(fb.getByTestId("oral-verdict")).toHaveText("Falsch");
  await expect(fb.getByText(/^Fehlt:/).first()).toBeAttached();
  await expect(fb.getByTestId("oral-model-answer")).toBeVisible();
  await fb.getByRole("button", { name: "Warum?" }).click();
  await expect(fb.getByText(/Wichtig ist vor allem/)).toBeVisible();

  // Nochmal sprechen: Musterantwort tippen → richtig
  const model = (await fb.getByTestId("oral-model-answer").textContent()) ?? "";
  await fb.getByRole("button", { name: "Nochmal sprechen" }).click();
  await typeAnswer(page, model);
  await expect(page.getByTestId("oral-verdict")).toHaveText("Richtig");
  await page.getByTestId("oral-next").click();

  // 2) Weiß ich nicht → falsch, Musterantwort sichtbar
  await expect(page.getByText("Mündlich · Frage 2/3")).toBeVisible();
  await page.getByRole("button", { name: "Weiß ich nicht" }).click();
  await expect(page.getByTestId("oral-verdict")).toHaveText("Falsch");
  await page.getByTestId("oral-next").click();

  // 3) Überspringen → Bericht
  await expect(page.getByText("Mündlich · Frage 3/3")).toBeVisible();
  await page.getByRole("button", { name: "Überspringen" }).click();
  const report = page.getByTestId("oral-report");
  await expect(report).toBeVisible();
  await expect(report.getByText("Deine Antworten")).toBeVisible();
  await expect(report.getByText("Nicht beantwortet")).toBeVisible();

  // Tageslimit: 2 Fragen gesprochen → 1 frei
  await page.goto("/muendlich");
  await settle(page);
  await expect(page.getByText("1 von 3 Fragen heute frei")).toBeVisible();
  await expect(page.getByText("Letzte Durchgänge")).toBeVisible();
});

test.describe("Aufnahme mit Mikrofon (simuliertes Gerät, siehe playwright.config.ts)", () => {
  test("Aufnehmen → Transkript → Bewertung", async ({ page }) => {
    await guest(page);
    await page.goto("/muendlich");
    await settle(page);
    await page.getByTestId("oral-start-ueben").click();
    await page.waitForURL(/\/muendlich\/[^/]+$/);
    await page.getByTestId("oral-mic").click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Mikrofon erlauben" }).click();
    await expect(page.getByRole("button", { name: "Aufnahme beenden" })).toBeVisible();
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: "Aufnahme beenden" }).click();
    await expect(page.getByTestId("oral-verdict")).toHaveText("Richtig", { timeout: 20_000 });
    await page.getByRole("button", { name: "Du hast gesagt:" }).click();
    await expect(page.getByTestId("oral-feedback").getByText(/^„/)).toBeVisible();
  });
});

test("Prüfungsmodus (Admin): Nachfrage, kein Zwischenfeedback, Bericht mit Kategorien", async ({ page }) => {
  await page.goto("/login");
  await settle(page);
  await page.getByLabel("E-Mail-Adresse").fill(ADMIN.email);
  await page.getByLabel("Passwort").fill(ADMIN.password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.waitForURL("**/dashboard");
  await page.goto("/muendlich");
  await settle(page);
  await page.getByLabel(/60 Sekunden pro Antwort/).check();
  await page.getByTestId("oral-start-pruefung").click();
  await page.waitForURL(/\/muendlich\/[^/]+\?timer=1$/);
  await expect(page.getByText("Mündlich · Frage 1/10")).toBeVisible();

  for (let i = 1; i <= 10; i++) {
    await expect(page.getByText(`Mündlich · Frage ${i}/10`)).toBeVisible();
    await typeAnswer(page, "Da bin ich mir nicht sicher.");
    await expect(page.getByTestId("oral-followup")).toBeVisible();
    await typeAnswer(page, "Leider weiß ich es nicht.");
    if (i < 10) await expect(page.getByTestId("oral-feedback")).toHaveCount(0);
  }
  const report = page.getByTestId("oral-report");
  await expect(report).toBeVisible({ timeout: 20_000 });
  await expect(report.getByTestId("oral-pass")).toHaveText("Nicht bestanden");
  await expect(report.getByText("Nach Kategorie")).toBeVisible();
  await report.getByRole("button", { name: /^1\./ }).click();
  await expect(report.getByText(/^Nachfrage:/)).toBeVisible();
  await report.getByRole("button", { name: /Schwache Fragen üben/ }).click();
  await page.waitForURL(/\/muendlich\/[^/?]+$/);
  await expect(page.getByText("Mündlich · Frage 1/10")).toBeVisible();
});

test("Admin: mündliche Fragen mit KI-Vorschlag", async ({ page }) => {
  await page.goto("/login");
  await settle(page);
  await page.getByLabel("E-Mail-Adresse").fill(ADMIN.email);
  await page.getByLabel("Passwort").fill(ADMIN.password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.waitForURL("**/dashboard");
  await page.goto("/admin/muendlich");
  await settle(page);
  await expect(page.getByRole("heading", { name: "Mündliche Fragen" })).toBeVisible();
  await expect(page.getByText(/\d+ Fragen · \d+ ungeprüft/)).toBeVisible();
  await page.getByLabel("Kategorie").selectOption({ label: "Straßenverkehrsordnung (StVO)" });
  await page.getByLabel("Frage", { exact: true }).fill("Was gilt beim Vorrang am Schutzweg?");
  await page.getByRole("button", { name: /Musterantwort & Kernpunkte vorschlagen/ }).click();
  await expect(page.getByText(/KI-Entwurf eingefügt/)).toBeVisible();
  await expect(page.getByLabel("Musterantwort")).not.toHaveValue("");
});
