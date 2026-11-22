import { expect, test, type Page } from "@playwright/test";

/** Audio-Studio (Test-Anbieter „fake“: kurzer Ton) + Mündlich Auto-Modus. */
const ADMIN = { email: process.env.SEED_ADMIN_EMAIL ?? "admin@taxi-pruefung.at", password: process.env.SEED_ADMIN_PASSWORD ?? "Admin!2026sicher" };

async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
}

async function admin(page: Page) {
  await page.goto("/login");
  await settle(page);
  await page.getByLabel("E-Mail-Adresse").fill(ADMIN.email);
  await page.getByLabel("Passwort").fill(ADMIN.password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.waitForURL("**/dashboard");
}

test.use({ viewport: { width: 390, height: 844 } });
test.describe.configure({ mode: "serial" });

test("Audio-Studio: Schätzung, Kapitel vertonen, Abdeckung, Vorschau, Lexikon", async ({ page }) => {
  test.setTimeout(120_000);
  await admin(page);
  await page.goto("/admin/audio");
  await settle(page);
  await expect(page.getByRole("heading", { name: "Audio-Studio" })).toBeVisible();
  await expect(page.getByTestId("audio-totals")).toContainText("Fragen");

  // Schätzung vor dem Start
  await page.getByTestId("audio-missing").click();
  await expect(page.getByTestId("audio-estimate")).toContainText(/Dateien aus \d+ Fragen/);
  await expect(page.getByTestId("audio-estimate")).toContainText("Zeichen");
  await page.getByRole("button", { name: "Abbrechen" }).click();

  // Kapitel „Umweltschutz“ (1 Frage) neu generieren
  await page.getByRole("button", { name: "Umweltschutz neu generieren" }).click();
  await expect(page.getByTestId("audio-estimate")).toContainText(/\d+ Dateien aus 1 Fragen/);
  await page.getByTestId("audio-confirm").click();
  const row = page.getByTestId("audio-coverage").locator("li", { hasText: "Umweltschutz" });
  await expect(row).toContainText("1/1 ✅", { timeout: 60_000 });

  // Lexikon-Vorschau
  await page.getByRole("button", { name: "So klingt’s" }).click();
  await expect(page.getByTestId("lexicon-preview")).toContainText("Paragraf vierundzwanzig Absatz eins Straßenverkehrsordnung");
  // Stichprobe
  await page.getByTestId("audio-sample").click();
  await expect(page.getByRole("button", { name: /abspielen/ }).first()).toBeVisible();
});

test("Mündlich Auto-Modus: Start, Frage hören, Countdown, Antwort aufdecken, Gewusst, Ende", async ({ page }) => {
  test.setTimeout(120_000);
  await admin(page);
  await page.goto("/muendlich/auto");
  await settle(page);
  await expect(page.getByRole("heading", { name: "Auto-Modus" })).toBeVisible();
  // kurze Antwortzeit für den Test
  await page.getByTestId("drill-settings-toggle").click();
  await page.getByTestId("drill-settings").getByRole("button", { name: "10 s" }).click();
  await page.getByTestId("drill-settings").getByRole("button", { name: "Stoppen" }).click();
  // Thema mit „Umweltschutz“ öffnen und starten
  await page.getByRole("button", { name: /Marketing, Umwelt & Sonstiges/ }).click();
  await page.getByTestId("drill-start-k-umweltschutz").click();
  await page.waitForURL("**/muendlich/auto/**");
  await expect(page.getByTestId("drill")).toBeVisible();
  const tap = page.getByTestId("drill-tap-start");
  if (await tap.isVisible().catch(() => false)) await tap.click();
  await expect(page.getByTestId("drill-counter")).toHaveText("Frage 1 / 1");
  await expect(page.getByTestId("drill-question")).toBeVisible();
  // nach dem Vorlesen (Testton ~1,2 s) läuft der Countdown
  await expect(page.getByTestId("drill-countdown")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("drill-fallback")).toHaveCount(0); // Studio-Audio vorhanden
  await page.getByTestId("drill-reveal").click();
  await expect(page.getByTestId("drill-answer")).not.toContainText("•••");
  await page.getByTestId("drill-known").click();
  await expect(page.getByTestId("drill-end")).toContainText("1 gewusst · 0 nicht gewusst");
});
