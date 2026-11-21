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

test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.locator('[aria-labelledby="celebration-title"]'), async (d) => {
    await d.getByRole("button").first().click();
  });
});

test("Lernbuch: Navigation, Story-Modus lesen, Kapitel-Check, Ergebnis", async ({ page }) => {
  await guest(page);
  // Dashboard-Widget + neue Tab-Leiste
  await expect(page.getByTestId("home-lernbuch")).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Schnellnavigation" });
  for (const label of ["Start", "Lernbuch", "Üben", "Prüfung", "Fortschritt"]) await expect(nav.getByRole("link", { name: label })).toBeVisible();
  await expect(page.getByTestId("coach-fab")).toBeVisible();

  await nav.getByRole("link", { name: "Lernbuch" }).click();
  await page.waitForURL("**/lernbuch");
  await settle(page);
  // 25 Kapitel in Buch-Reihenfolge
  await expect(page.getByTestId("lernbuch-chapters").getByRole("listitem")).toHaveCount(25);
  await page.getByTestId("chapter-k-umweltschutz").click();
  await page.waitForURL("**/lernbuch/sonstiges/k-umweltschutz");
  await settle(page);
  await expect(page.getByTestId("start-chapter-check")).toBeDisabled();
  await expect(page.getByTestId("section-1")).toBeVisible();

  // Story-Modus: Intro → Karte → Verstanden → Zusammenfassung
  await page.getByTestId("mode-story").click();
  await page.waitForURL("**/lernbuch/story/k-umweltschutz**");
  await settle(page);
  await page.getByTestId("story-start").click();
  await expect(page.getByTestId("story-card")).toBeVisible();
  await expect(page.getByTestId("story-answer")).toBeVisible();
  await page.getByTestId("story-toggle-wrong").click();
  await expect(page.getByTestId("story-wrong")).toBeVisible();
  await page.getByTestId("story-star").click();
  await expect(page.getByTestId("story-star")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("story-understood").click();
  await expect(page.getByTestId("story-summary")).toBeVisible();
  await page.getByTestId("summary-check").click();
  await page.waitForURL("**/lernbuch/sonstiges/k-umweltschutz");
  await settle(page);

  // Kapitel-Check (nur Antwortmöglichkeiten, kein Modus-Dialog)
  await expect(page.getByTestId("start-chapter-check")).toBeEnabled();
  await page.getByTestId("start-chapter-check").click();
  await page.waitForURL("**/quiz/**");
  await settle(page);
  await expect(page.getByRole("alertdialog", { name: "Wie möchtest du üben?" })).toHaveCount(0);
  await expect(page.getByTestId("answer-mode-toggle")).toHaveCount(0);
  for (let i = 0; i < 12 && !page.url().includes("/lernbuch/check/"); i++) {
    if (await page.getByRole("radio").first().isVisible().catch(() => false)) await page.keyboard.press("a");
    await page.getByTestId("focus-primary").click().catch(() => undefined);
    await page.waitForTimeout(400);
  }
  await page.waitForURL("**/lernbuch/check/**");
  await expect(page.getByTestId("check-result")).toBeVisible();
});

test("Üben-Hub: Unter-Tabs und Lese-Liste / Karteikarten / Hör-Modus", async ({ page }) => {
  await guest(page);
  await page.getByRole("navigation", { name: "Schnellnavigation" }).getByRole("link", { name: "Üben" }).click();
  await page.waitForURL("**/ueben");
  const tabs = page.getByRole("navigation", { name: "Üben" });
  await expect(tabs.getByRole("link", { name: "Wiederholung" })).toHaveAttribute("aria-current", "page");
  await tabs.getByRole("link", { name: "Fehlertraining" }).click();
  await page.waitForURL("**/fehler");
  await expect(page.getByRole("navigation", { name: "Schnellnavigation" }).getByRole("link", { name: "Üben" })).toHaveAttribute("aria-current", "page");

  await page.goto("/lernbuch/sonstiges/k-marketing/liste");
  await settle(page);
  await expect(page.getByTestId("list-card").first()).toBeVisible();
  await page.goto("/lernbuch/sonstiges/k-marketing/karten");
  await settle(page);
  await page.getByTestId("flashcard").click();
  await expect(page.getByTestId("flashcard")).toContainText("Antwort");
  await page.getByTestId("card-understood").click();
  await page.goto("/lernbuch/sonstiges/k-marketing/hoeren");
  await settle(page);
  await expect(page.getByTestId("audio-card")).toBeVisible();
});

test("Lernbuch: Kapitel in Abschnitte à 10 Fragen, weiter zum nächsten Abschnitt", async ({ page }) => {
  await guest(page);
  await page.goto("/lernbuch/rechnungswesen/k-rechnungswesen");
  await settle(page);
  // 43 Fragen → 5 Abschnitte
  await expect(page.getByTestId("chapter-sections").locator(":scope > li")).toHaveCount(5);
  await expect(page.getByTestId("section-5")).toContainText("Fragen 41–43");
  await page.getByTestId("section-read-2").click();
  await page.waitForURL("**abschnitt=2**");
  await settle(page);
  await expect(page.getByTestId("story-intro")).toContainText("Abschnitt 2 von 5");
  await expect(page.getByTestId("story-intro")).toContainText("Fragen 11–20");
  await page.getByTestId("story-start").click();
  for (let i = 0; i < 10; i++) await page.getByTestId("story-understood").click();
  await expect(page.getByTestId("story-summary")).toContainText("Abschnitt 2 geschafft!");
  await page.getByTestId("summary-next-section").click();
  await page.waitForURL("**abschnitt=3**");
  await settle(page);
  await expect(page.getByTestId("story-intro")).toContainText("Fragen 21–30");
});
