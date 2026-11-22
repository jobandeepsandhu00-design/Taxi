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
  await page.addLocatorHandler(page.getByRole("alertdialog", { name: "Wie möchtest du üben?" }), async (d) => {
    await d.getByRole("button", { name: "Mit Antwortmöglichkeiten" }).click();
  });
  await page.addLocatorHandler(page.locator('[aria-labelledby="celebration-title"]'), async (dialog) => {
    await dialog.getByRole("button").click();
  });
});

test.describe.serial("Taxi-Coach", () => {
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.addLocatorHandler(page.getByRole("alertdialog", { name: "Wie möchtest du üben?" }), async (d) => {
      await d.getByRole("button", { name: "Mit Antwortmöglichkeiten" }).click();
    });
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

  test("Quiz: „Warum?“ nach falscher Antwort – aus der Datenbank, ohne KI", async () => {
    await page.goto("/quiz");
    await settle(page);
    await page.getByLabel("Anzahl Fragen").selectOption("20");
    await page.getByRole("button", { name: "Quiz starten" }).click();
    await page.waitForURL("**/quiz/**");
    await settle(page);
    // Ohne KI kein B1-Knopf, keine „nicht eingerichtet“-Meldung
    await expect(page.getByRole("button", { name: "Einfache Sprache" })).toHaveCount(0);

    let wrong = false;
    for (let i = 0; i < 20 && !wrong; i++) {
      await page.getByRole("radiogroup", { name: "Antwortmöglichkeiten" }).or(page.getByRole("group", { name: "Antwortmöglichkeiten" })).locator("button").last().click();
      await page.getByRole("button", { name: "Antwort prüfen" }).click();
      const result = page.getByText(/^(Richtig!|Leider falsch)$/);
      await expect(result).toBeVisible();
      wrong = (await result.textContent()) === "Leider falsch";
      if (!wrong) await page.getByTestId("focus-primary").click();
    }
    expect(wrong).toBe(true);
    await page.getByRole("button", { name: /Erklärung & Warum/ }).click();
    await page.getByTestId("why-button").click();
    const why = page.getByTestId("why-panel");
    await expect(why.getByText("Richtige Antwort")).toBeVisible();
    await expect(why.getByText("Erklärung", { exact: true })).toBeVisible();
    await expect(page.getByText(/noch nicht eingerichtet/)).toHaveCount(0);
  });

  test("Smart Coach: Toni, Plan, Schwächen, Prognose, Frag Toni (Suche, Tippfehler, Chips)", async () => {
    await page.goto("/coach");
    await settle(page);
    await expect(page.getByText(/noch nicht eingerichtet/)).toHaveCount(0);
    await expect(page.getByTestId("coach-hero")).toBeVisible();
    await expect(page.getByTestId("daily-plan")).toBeVisible();
    await expect(page.getByTestId("coach-weaknesses").getByRole("link", { name: "Üben" })).toHaveCount(3);
    await expect(page.getByTestId("coach-prognosis")).toContainText(/ab 5 Lerntagen|Prüfungsbereit voraussichtlich/);
    await expect(page.getByTestId("coach-weekly")).toBeVisible();

    // Schnell-Chip → regelbasierte Antwort
    await page.getByTestId("toni-chip").filter({ hasText: "Was soll ich heute lernen?" }).click();
    await expect(page.getByTestId("toni-answer")).toContainText("Das würde ich heute lernen");
    await page.getByTestId("toni-chip").filter({ hasText: "Wie stehe ich?" }).click();
    await expect(page.getByTestId("toni-answer")).toContainText("So stehst du");
    await page.getByTestId("toni-chip").filter({ hasText: "Prüfungstipps" }).click();
    await expect(page.getByTestId("toni-answer")).toContainText("Was muss ich am Prüfungstag mitnehmen?");

    // Suche mit Tippfehler: „Schutzweck“ → Schutzweg
    await page.getByTestId("toni-input").fill("Schutzweck");
    await page.getByTestId("toni-ask").click();
    await expect(page.getByTestId("toni-best")).toContainText(/Schutzweg/i);

    // Frage aus dem Skript: beste Antwort + ähnliche Fragen
    await page.getByTestId("toni-input").fill("Was ist Prokura?");
    await page.getByTestId("toni-ask").click();
    await expect(page.getByTestId("toni-best")).toContainText(/Prokura/);
    await expect(page.getByTestId("toni-best")).toContainText("Richtige Antwort");
    await expect(page.getByTestId("toni-similar").first()).toBeVisible();

    // Nichts gefunden → Hinweis + Vorschläge
    await page.getByTestId("toni-input").fill("qqxyz blorfk");
    await page.getByTestId("toni-ask").click();
    await expect(page.getByTestId("toni-empty")).toContainText("Dazu habe ich nichts gefunden");
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
