import { expect, test, type Page } from "@playwright/test";

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

test("Lernplan: Home-Karte, Filter, Suche, Sperre, Vorschau, Lektion starten und Status-Update", async ({ page }) => {
  await page.addLocatorHandler(page.locator('[aria-labelledby="celebration-title"]'), async (d) => {
    await d.getByRole("button").click();
  });
  await guest(page);

  // Home-Karte
  const card = page.getByTestId("learn-plan-card");
  await expect(card.getByRole("heading", { name: "Dein Lernplan" })).toBeVisible();
  await expect(card.getByText(/von \d+ Fragen gemeistert/)).toBeVisible();
  await expect(card.getByText("Heute dran:")).toBeVisible();
  await card.getByRole("link", { name: /Ganzer Lernplan/ }).click();
  await page.waitForURL("**/lernplan");
  await settle(page);

  // Kopf
  await expect(page.getByTestId("plan-goal")).toContainText(/Noch \d+ Lektionen · ca\. \d+ pro Tag/);
  await expect(page.getByRole("img", { name: /Lernplan zu \d+ % geschafft/ })).toBeVisible();

  // Filter + Suche
  await page.getByRole("radio", { name: "Falsch" }).click();
  await expect(page.getByText("0 Fragen gefunden")).toBeVisible();
  await page.getByRole("radio", { name: "Alle" }).click();
  await page.getByLabel("Fragen durchsuchen").fill("Telebanking");
  await expect(page.getByText("1 Frage gefunden")).toBeVisible();
  await page.getByRole("button", { name: /Telebanking/ }).click();
  const sheet = page.getByTestId("question-sheet");
  await expect(sheet).toContainText("Noch nicht beantwortet");
  await sheet.getByRole("button", { name: "Merken" }).click();
  await expect(sheet.getByRole("button", { name: "Gemerkt" })).toBeVisible();
  await expect(sheet.getByRole("link", { name: /Jetzt üben/ })).toHaveAttribute("href", /\/fragen\//);
  await page.getByRole("button", { name: "Vorschau schließen" }).click();
  await page.getByRole("button", { name: "Suche löschen" }).click();

  // Gesperrte Lektion → Hinweis (Kapitel „Steuerrecht“ hat mehrere Lektionen)
  const steuer = page.locator("button[aria-expanded]", { hasText: "Steuerrecht" }).first();
  if ((await steuer.getAttribute("aria-expanded")) !== "true") await steuer.click();
  const locked = page.getByRole("button", { name: /Lektion 2 – gesperrt/ }).first();
  await locked.click();
  await expect(page.getByRole("status")).toContainText("Schließe zuerst Lektion 1 ab");

  // Fragen einer Lektion aufklappen
  await page.getByRole("button", { name: /Fragen von Lektion 1 anzeigen/ }).first().click();
  await expect(page.getByRole("button", { name: /– Neu/ }).first()).toBeVisible();

  // Nächster Schritt → Lektion starten, 5 Fragen beantworten
  await page.getByTestId("next-step").click();
  await page.waitForURL("**/quiz/**");
  await settle(page);
  for (let i = 0; i < 5; i++) {
    await page.getByRole("radiogroup", { name: "Antwortmöglichkeiten" }).or(page.getByRole("group", { name: "Antwortmöglichkeiten" })).locator("button").first().click();
    await page.getByRole("button", { name: "Antwort prüfen" }).click();
    await expect(page.getByText(/^(Richtig!|Leider falsch)$/)).toBeVisible();
    await page.getByTestId("focus-primary").click();
  }
  await expect(page.getByTestId("lesson-result")).toBeVisible();

  // Lernplan aktualisiert: Lektion 1 ist jetzt in Arbeit (oder gemeistert), nächster Schritt wird angeboten
  await page.goto("/lernplan");
  await settle(page);
  const first = page.getByTestId("lesson-row").first();
  await expect(first).toContainText(/In Arbeit|Gemeistert/);
  await expect(page.getByTestId("next-step")).toContainText(/Nächster Schritt: Lektion \d+ starten/);
});
