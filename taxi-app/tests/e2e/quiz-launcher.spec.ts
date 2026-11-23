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
  await page.addLocatorHandler(page.getByRole("alertdialog", { name: "Wie möchtest du üben?" }), async (d) => {
    await d.getByRole("button", { name: "Mit Antwortmöglichkeiten" }).click();
  });
  await page.addLocatorHandler(page.locator('[aria-labelledby="celebration-title"]'), async (d) => {
    await d.getByRole("button").first().click();
  });
});

test("Quiz-Knopf: Launcher öffnen/schließen, Schriftlich/Mündlich, Simulation bestätigen und starten", async ({ page }) => {
  await guest(page);
  const fab = page.getByTestId("quiz-fab");
  await expect(fab).toHaveAttribute("aria-expanded", "false");
  await fab.click();
  const dialog = page.getByRole("dialog", { name: "Was möchtest du üben?" });
  await expect(dialog).toBeVisible();
  await expect(fab).toHaveAttribute("aria-expanded", "true");
  // Esc schließt
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await fab.click();
  await expect(page.getByTestId("sim-cards").getByRole("button")).toHaveCount(3);
  await expect(page.getByTestId("sim-60")).toContainText("Wie echt");
  await expect(page.getByTestId("sim-15")).toContainText("15 Fragen");
  // Mündlich: Fragen passend zur Zeit
  await page.getByTestId("launcher-type-muendlich").click();
  await expect(page.getByTestId("launcher-type-muendlich")).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("sim-15")).toContainText(/≈ \d+ Fragen/);
  await expect(page.getByTestId("row-mini")).toContainText("3 Fragen");
  await page.getByTestId("launcher-type-schriftlich").click();
  await expect(page.getByTestId("row-mini")).toContainText("5 Fragen");
  // Simulation 15 min → Bestätigung → Start (zeitgesteuerte Prüfung)
  await page.getByTestId("sim-15").click();
  await expect(page.getByTestId("sim-confirm")).toContainText("Kein Feedback bis zum Ende");
  await page.getByTestId("sim-start").click();
  await page.waitForURL(/\/quiz\/(?!start)[^/?]+$/);
  await expect(page.getByRole("button", { name: "Prüfung beenden" })).toBeVisible();
});

test("Launcher: Mini-Quiz, Kapitel-Auswahl und „Zuletzt“", async ({ page }) => {
  await guest(page);
  await page.getByTestId("quiz-fab").click();
  await page.getByTestId("row-mini").click();
  await page.waitForURL(/\/quiz\/(?!start)[^/?]+$/);
  await expect(page.getByText(/Frage 1 \/ 5/)).toBeVisible();
  // zurück, Kapitel-Quiz
  await page.goto("/dashboard");
  await settle(page);
  await page.getByTestId("quiz-fab").click();
  await expect(page.getByTestId("launcher-last")).toContainText("Zuletzt: Schriftlich · Mini-Quiz");
  await page.getByTestId("row-chapter").click();
  await expect(page.getByTestId("chapter-picker")).toBeVisible();
  await page.getByTestId("chapter-picker").getByText("1. Rechnungswesen").click();
  await expect(page.getByTestId("chapter-start")).toContainText("Starten · 10 Fragen");
  await page.getByTestId("chapter-start").click();
  await page.waitForURL(/\/quiz\/(?!start)[^/?]+$/);
  await expect(page.getByText(/Frage 1 \/ 10/)).toBeVisible();
});

test("Launcher: Mündlich Mini-Quiz startet den Auto-Modus", async ({ page }) => {
  await guest(page);
  await page.getByTestId("quiz-fab").click();
  await page.getByTestId("launcher-type-muendlich").click();
  await page.getByTestId("row-mini").click();
  await page.waitForURL("**/muendlich/auto/**");
  await expect(page.getByTestId("drill")).toBeVisible();
  await expect(page.getByTestId("drill-counter")).toHaveText("Frage 1 / 3");
});

test("Mündliche Simulation: Antwortzeit 10/30/60 s wählen, Fragenanzahl passt sich an", async ({ page }) => {
  await guest(page);
  await page.getByTestId("quiz-fab").click();
  await page.getByTestId("launcher-type-muendlich").click();
  await page.getByTestId("sim-15").click();
  const confirm = page.getByTestId("sim-confirm");
  await expect(page.getByTestId("oral-sec-60")).toHaveAttribute("aria-checked", "true");
  await expect(confirm).toContainText("60 s Zeit");
  const count = async () => Number((await confirm.textContent())?.match(/≈ (\d+) Fragen/)?.[1]);
  const n60 = await count();
  await page.getByTestId("oral-sec-10").click();
  await expect(page.getByTestId("oral-sec-10")).toHaveAttribute("aria-checked", "true");
  await expect(confirm).toContainText("10 s Zeit");
  expect(await count()).toBeGreaterThan(n60);
  await page.getByTestId("sim-start").click();
  await page.waitForURL(/\/muendlich\/auto\/[^/]+$/);
  // gewählte Zeit bleibt für das nächste Mal gespeichert
  expect(await page.evaluate(() => localStorage.getItem("tp-oral-answer-sec"))).toBe("10");
});
