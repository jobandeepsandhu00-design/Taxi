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
  await page.getByTestId("story-close").click();
  await expect(viewer).toBeHidden();
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
