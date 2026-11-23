import { expect, test, type Page } from "@playwright/test";

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

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test("Story-Leiste: Kreise, öffnen, weiter tippen, automatisch zur nächsten Gruppe, gesehen-Status bleibt", async ({ page }) => {
  await guest(page);
  const row = page.getByTestId("story-row");
  await expect(row).toBeVisible();
  for (const key of ["toni", "tipp", "ort", "regel", "zahl", "quiz"]) await expect(page.getByTestId(`story-circle-${key}`)).toBeAttached();
  // persönlich zuerst
  await expect(row.locator("[data-story-key]").first()).toHaveAttribute("data-story-key", "toni");

  // Zahl des Tages öffnen und durchtippen
  await row.hover(); // Laufband anhalten (wie ein Finger auf der Leiste)
  await page.getByTestId("story-circle-zahl").click();
  const viewer = page.getByTestId("story-viewer");
  await expect(viewer).toBeVisible();
  await expect(viewer).toHaveAttribute("aria-label", "Story: Zahl des Tages");
  const first = await page.getByTestId("story-title").textContent();
  await viewer.click({ position: { x: 330, y: 400 } });
  await expect(page.getByTestId("story-title")).not.toHaveText(first ?? "");
  await viewer.click({ position: { x: 330, y: 400 } });
  // Ende der Gruppe → nächste ungesehene Gruppe
  await expect(viewer).not.toHaveAttribute("aria-label", "Story: Zahl des Tages");
  const t0 = Date.now();
  await page.getByTestId("story-close").click();
  await expect(viewer).toBeHidden({ timeout: 1500 });
  console.log("story close ms", Date.now() - t0);
  expect(Date.now() - t0).toBeLessThan(800);
  await expect(page.getByTestId("story-circle-zahl")).toHaveAttribute("aria-label", /gesehen/);

  // gespeichert: nach dem Neuladen weiterhin gesehen
  await page.waitForTimeout(800);
  await page.reload();
  await settle(page);
  await expect(page.getByTestId("story-circle-zahl")).toHaveAttribute("aria-label", /gesehen/);
  await expect(page.getByTestId("story-circle-tipp")).not.toHaveAttribute("aria-label", /gesehen/);
});

test("Quiz-Story: Antwort tippen gibt sofort Feedback; Zurück-Taste schließt die Story", async ({ page }) => {
  await guest(page);
  await page.getByTestId("story-row").hover();
  await page.getByTestId("story-circle-quiz").click();
  const viewer = page.getByTestId("story-viewer");
  await expect(viewer).toBeVisible();
  await page.getByTestId("story-quiz-option").first().click();
  await expect(page.getByTestId("story-quiz-result")).toBeVisible();
  await page.goBack();
  await expect(viewer).toBeHidden();
  expect(new URL(page.url()).pathname).toBe("/dashboard");
});

test("Wien-Ort: Karte öffnen; eigene Story-Seite (z. B. aus Push) schließt zur Startseite", async ({ page }) => {
  await guest(page);
  await page.goto("/stories/ort");
  const viewer = page.getByTestId("story-viewer");
  await expect(viewer).toHaveAttribute("aria-label", "Story: Wien-Ort");
  await page.getByTestId("story-map-btn").click();
  await expect(page.getByTestId("story-map-sheet")).toBeVisible();
  await page.getByRole("button", { name: "Karte schließen" }).click();
  await page.getByTestId("story-close").click();
  await page.waitForURL("**/dashboard");
});

test("Admin: Stories verwalten, Vorschau im Handy-Rahmen", async ({ page }) => {
  await page.goto("/login");
  await settle(page);
  await page.getByLabel("E-Mail-Adresse").fill(ADMIN.email);
  await page.getByLabel("Passwort").fill(ADMIN.password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.waitForURL("**/dashboard");
  await page.goto("/admin/stories");
  await settle(page);
  const tipp = page.getByTestId("admin-story-tipp");
  await expect(tipp).toBeVisible();
  await tipp.getByRole("button", { name: "Vorschau" }).click();
  await expect(page.getByTestId("story-phone-preview").getByTestId("story-title")).toBeVisible();
  await page.getByRole("button", { name: "Vorschau schließen" }).click();
  // Slide mit fremdem Bild ohne Nachweis wird abgelehnt
  await tipp.getByRole("button", { name: /Slides/ }).click();
  await tipp.getByRole("button", { name: "Slide", exact: true }).click();
  const title = `Test-Slide ${Date.now().toString(36)}`;
  await tipp.getByLabel("Titel").first().fill(title);
  await tipp.locator('input[type="file"]').first().setInputFiles({ name: "bild.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64") });
  await tipp.getByRole("button", { name: "Slide speichern" }).click();
  await expect(tipp.getByText("Bildnachweis fehlt")).toBeVisible();
  await tipp.getByLabel("Eigenes Bild").first().check();
  await tipp.getByRole("button", { name: "Slide speichern" }).click();
  await expect(tipp.getByText(title)).toBeVisible();
});

test("Lern-Story: alle Kapitel als Kreise, Frage für Frage mit Antwort, Tempo wählbar, Fortschritt bleibt", async ({ page }) => {
  await guest(page);
  const row = page.getByTestId("story-row");
  await row.hover();
  const chapters = row.locator('[data-story-key^="kap-"]');
  expect(await chapters.count()).toBeGreaterThanOrEqual(20);
  const first = chapters.first();
  const key = await first.getAttribute("data-story-key");
  await first.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await first.click();
  const viewer = page.getByTestId("story-viewer");
  await expect(page.getByTestId("story-pace")).toBeVisible();
  // Tempo: 3 Fragen/Minute, 3 Minuten → 9 Fragen pro Tag
  await page.getByTestId("story-pace").getByRole("button", { name: "3", exact: true }).click();
  await page.getByTestId("story-pace").getByRole("button", { name: "3 Min" }).click();
  await expect(page.getByTestId("story-pace")).toContainText("= 9 Fragen pro Tag");
  await expect(viewer).toContainText("Heute 9 Fragen");
  // erste Frage
  await viewer.click({ position: { x: 340, y: 200 } });
  await expect(page.getByTestId("story-title")).toContainText("Frage 1 von");
  const q1 = await page.getByTestId("story-question").textContent();
  await page.getByTestId("story-reveal").click();
  await expect(page.getByTestId("story-answer")).toBeVisible();
  await page.getByTestId("story-next").click();
  await expect(page.getByTestId("story-title")).toContainText("Frage 2 von");
  await page.getByTestId("story-close").click();
  await expect(viewer).toBeHidden();
  // nach dem Neuladen geht es bei Frage 3 weiter
  await page.waitForTimeout(800);
  await page.reload();
  await settle(page);
  await page.getByTestId("story-row").hover();
  const again = page.locator(`[data-story-key="${key}"]`);
  await again.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await again.click();
  await expect(page.getByTestId("story-viewer")).toContainText("2 von");
  await page.getByTestId("story-viewer").click({ position: { x: 340, y: 200 } });
  await expect(page.getByTestId("story-title")).toContainText("Frage 3 von");
  expect(await page.getByTestId("story-question").textContent()).not.toBe(q1);
});
