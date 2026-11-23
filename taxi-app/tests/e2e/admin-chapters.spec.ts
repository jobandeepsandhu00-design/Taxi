import { expect, test, type Page } from "@playwright/test";

const ADMIN = { email: process.env.SEED_ADMIN_EMAIL ?? "admin@taxi-pruefung.at", password: process.env.SEED_ADMIN_PASSWORD ?? "Admin!2026sicher" };

async function login(page: Page) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("E-Mail-Adresse").fill(ADMIN.email);
  await page.getByLabel("Passwort").fill(ADMIN.password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.waitForURL("**/dashboard");
}

test("Kapitel & Fragen: Kapitel anlegen, Frage hinzufügen, bearbeiten, verschieben, löschen, Kapitel löschen", async ({ page }) => {
  page.on("dialog", (d) => void d.accept());
  await login(page);
  await page.goto("/admin/kapitel");
  await page.waitForLoadState("networkidle");
  const name = `Testkapitel ${Date.now().toString(36)}`;
  await page.getByTestId("new-chapter-name").fill(name);
  await page.getByTestId("new-chapter-btn").click();
  await page.getByRole("link", { name: new RegExp(name) }).first().click();
  await page.waitForURL(/\/admin\/kapitel\/[^/]+$/);
  await expect(page.getByTestId("chapter-name")).toHaveValue(name);

  // zwei Fragen anlegen
  for (const [q, a] of [["Wie heißt die Hauptstadt von Österreich?", "Wien"], ["Wie viele Bezirke hat Wien?", "23"]]) {
    await page.getByTestId("add-question").click();
    const form = page.getByTestId("new-question");
    await form.getByRole("textbox", { name: "Frage", exact: true }).fill(q!);
    await form.getByRole("textbox", { name: "Antwort A" }).fill(a!);
    await form.getByRole("textbox", { name: "Antwort B" }).fill("Falsch");
    await form.getByTestId("question-save").click();
    await expect(page.locator("li").filter({ hasText: q! })).toBeVisible();
  }
  const cards = page.locator('[data-testid^="q-card-"]');
  await expect(cards).toHaveCount(2);
  await expect(cards.first()).toContainText("Hauptstadt");

  // bearbeiten
  await cards.first().getByTestId("q-edit").click();
  await cards.first().getByRole("textbox", { name: "Antwort A" }).fill("Wien (Bundeshauptstadt)");
  await cards.first().getByTestId("question-save").click();
  await expect(cards.first()).toContainText("✓ Wien (Bundeshauptstadt)");

  // verschieben: zweite Frage nach oben
  await cards.nth(1).getByRole("button", { name: "Nach oben" }).click();
  await expect(cards.first()).toContainText("Bezirke");

  // löschen
  await cards.first().getByTestId("q-delete").click();
  await expect(cards).toHaveCount(1);

  // Kapitel umbenennen, dann samt Fragen löschen
  await page.getByTestId("chapter-name").fill(`${name} neu`);
  await page.getByTestId("chapter-save").click();
  await expect(page.getByText("Kapitel gespeichert.")).toBeVisible();
  await page.goto("/admin/kapitel");
  await page.waitForLoadState("networkidle");
  const row = page.locator('[data-testid^="chapter-row-"]').filter({ hasText: `${name} neu` });
  await expect(row).toContainText("1 Fragen");
  await row.getByRole("button", { name: "Kapitel löschen" }).click();
  await expect(row).toHaveCount(0);
});
