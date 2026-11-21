import { expect, test, type Page } from "@playwright/test";

/** Taxi-Coach im Fake-Modus (COACH_FAKE=1, siehe playwright.config.ts). */

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

test.beforeEach(async ({ page }) => {
  await page.addLocatorHandler(page.locator('[aria-labelledby="celebration-title"]'), async (dialog) => {
    await dialog.getByRole("button").click();
  });
});

test.describe.serial("Taxi-Coach", () => {
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.addLocatorHandler(page.locator('[aria-labelledby="celebration-title"]'), async (dialog) => {
      await dialog.getByRole("button").click();
    });
    await guest(page);
  });
  test.afterAll(async () => page.close());

  test("Home: Tagesplan, Prognose und Coach-Sprechblase", async () => {
    await expect(page.getByTestId("daily-plan")).toBeVisible();
    await expect(page.getByText("Dein Plan für heute")).toBeVisible();
    await expect(page.getByTestId("prognosis")).toContainText(/Sicherheit: (hoch|mittel|niedrig)/);
    const bubble = page.getByTestId("coach-bubble");
    await expect(bubble).toBeVisible();
    await bubble.getByRole("button", { name: "Hinweis schließen" }).click();
    await expect(bubble).toHaveCount(0);
    await page.reload();
    await settle(page);
    await expect(page.getByTestId("coach-bubble")).toHaveCount(0);

    // Punkt manuell abhaken – bleibt nach Neuladen erhalten
    const challenge = page.getByRole("button", { name: /Daily Challenge – abhaken/ });
    await challenge.click();
    await expect(page.getByRole("button", { name: /Daily Challenge – als offen markieren/ })).toBeVisible();
    await page.waitForTimeout(500);
    await page.reload();
    await expect(page.getByRole("button", { name: /Daily Challenge – als offen markieren/ })).toBeVisible();
  });

  test("Quiz: Einfache Sprache und „Warum?“ nach falscher Antwort", async () => {
    await page.goto("/quiz");
    await settle(page);
    await page.getByLabel("Anzahl Fragen").selectOption("20");
    await page.getByRole("button", { name: "Quiz starten" }).click();
    await page.waitForURL("**/quiz/**");
    await settle(page);

    await page.getByRole("button", { name: "Einfache Sprache" }).click();
    await expect(page.getByText(/^Einfache Sprache \(B1\)/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Einfache Sprache" })).toHaveAttribute("aria-pressed", "true");

    let wrong = false;
    for (let i = 0; i < 20 && !wrong; i++) {
      // letzte Option wählen – erhöht die Chance auf eine falsche Antwort
      await page.getByRole("radiogroup", { name: "Antwortmöglichkeiten" }).or(page.getByRole("group", { name: "Antwortmöglichkeiten" })).locator("button").last().click();
      await page.getByRole("button", { name: "Antwort prüfen" }).click();
      const result = page.getByText(/^(Richtig!|Leider falsch)$/);
      await expect(result).toBeVisible();
      wrong = (await result.textContent()) === "Leider falsch";
      if (!wrong) await page.getByTestId("focus-primary").click();
    }
    expect(wrong).toBe(true);
    await page.getByRole("button", { name: /Erklärung & Warum/ }).click();
    await page.getByRole("button", { name: /Warum\? – Coach erklären lassen/ }).click();
    await expect(page.getByTestId("why-panel").getByText("Die Regel")).toBeVisible();
    await expect(page.getByTestId("why-panel").getByText("Beispiel aus dem Taxi-Alltag")).toBeVisible();
  });

  test("Chat: Vorschläge, Streaming, Quellenkarten und Feedback", async () => {
    await page.goto("/coach");
    await settle(page);
    await expect(page.getByRole("heading", { name: "Dein Taxi-Coach" })).toBeVisible();
    await expect(page.getByText(/von 30 Nachrichten heute übrig/)).toBeVisible();

    await page.getByRole("button", { name: "Was soll ich heute lernen?" }).click();
    await expect(page.getByText(/Heute würde ich so vorgehen/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Hilfreiche Antwort", exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Hilfreiche Antwort", exact: true }).first().click();
    await expect(page.getByRole("button", { name: "Hilfreiche Antwort", exact: true }).first()).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: "Erklär mir den Deckungsbeitrag" }).click();
    const card = page.getByRole("link", { name: /Frage üben/ }).first();
    await expect(card).toBeVisible();
    await expect(page.getByText(/passende Fragen gefunden/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Hilfreiche Antwort", exact: true })).toHaveCount(2);

    // Verlauf bleibt erhalten
    await page.reload();
    await settle(page);
    await expect(page.getByText(/Heute würde ich so vorgehen/)).toBeVisible();
    await expect(page.getByText(/\d+ von 30 Nachrichten heute übrig/)).toBeVisible();

    await page.getByRole("link", { name: /Frage üben/ }).first().click();
    await page.waitForURL("**/fragen/**");
  });

  test("Alte mündliche Prüfung leitet zur Sprechprüfung", async () => {
    await page.goto("/coach/muendlich");
    await page.waitForURL("**/muendlich");
    await expect(page.getByRole("heading", { name: "Mündliche Prüfung" })).toBeVisible();
  });

  test("Wochenbericht als Story-Karten", async () => {
    await page.goto("/coach/bericht");
    await settle(page);
    const stories = page.getByTestId("report-stories");
    await expect(stories).toBeVisible();
    await expect(stories.getByText(/Wochenbericht ab/)).toBeVisible();
    await stories.getByRole("button", { name: "Nächste Karte" }).click();
    await expect(stories.getByText("Deine Woche in Zahlen")).toBeVisible();
    for (let i = 0; i < 4; i++) await stories.getByRole("button", { name: "Nächste Karte" }).click();
    await expect(stories.getByText("Deine 3 Schritte für nächste Woche")).toBeVisible();
    await expect(stories.locator("ol li")).toHaveCount(3);
  });

  test("Cron: ohne Geheimnis gesperrt", async ({ request }) => {
    expect((await request.get("/api/cron/coach-daily")).status()).toBe(401);
  });
});
