import { expect, test, type Page } from "@playwright/test";

async function guest(page: Page) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /Als Gast testen/ }).click();
  await page.waitForURL("**/willkommen");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Taxilenker:in" }).click();
  await page.getByRole("button", { name: /Weiter/ }).click();
  await page.getByLabel("Mein Termin steht noch nicht fest").check();
  await page.getByRole("button", { name: /Weiter/ }).click();
  await page.getByRole("radio", { name: /20/ }).click();
  await page.getByRole("button", { name: /Los geht/ }).click();
  await page.waitForURL("**/dashboard");
  await page.waitForLoadState("networkidle");
}

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test("Lernende: Frage umformulieren (nur für mich), ausblenden + wiederherstellen, eigene Frage, eigenes Kapitel in den Stories", async ({ page }) => {
  page.on("dialog", (d) => void d.accept());
  await guest(page);
  await page.goto("/lernbuch");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("lernbuch-my-link").click();
  await page.waitForURL("**/lernbuch/eigene");
  const firstCat = page.locator('[data-testid^="my-cat-"]').first();
  const catId = (await firstCat.getAttribute("data-testid"))!.replace("my-cat-", "");
  await firstCat.click();
  await page.waitForURL(`**/lernbuch/eigene/${catId}`);

  // 1) erste Frage umformulieren
  const cards = page.locator('[data-testid^="my-card-"]');
  const first = cards.first();
  await first.getByTestId("my-q-edit").click();
  const myText = `Meine Fassung ${Date.now().toString(36)}?`;
  await first.getByRole("textbox", { name: "Frage", exact: true }).fill(myText);
  await first.getByTestId("question-save").click();
  await expect(first).toContainText("VON DIR GEÄNDERT");
  await expect(first).toContainText(myText);

  // 2) zweite Frage ausblenden, dann wiederherstellen
  const secondText = (await cards.nth(1).locator("p.font-bold").textContent())!;
  await cards.nth(1).getByTestId("my-q-hide").click();
  await expect(page.getByTestId("my-hidden-toggle")).toContainText("(1)");
  await expect(page.locator('[data-testid^="my-card-"]').filter({ hasText: secondText })).toHaveCount(0);
  await page.getByTestId("my-hidden-toggle").click();
  await page.locator('[data-testid^="my-card-"]').filter({ hasText: secondText }).getByTestId("my-q-restore").click();
  await expect(page.getByTestId("my-hidden-toggle")).toHaveCount(0);

  // 3) eigene Frage hinzufügen
  await page.getByTestId("my-add-question").click();
  const form = page.getByTestId("my-new-question");
  await form.getByRole("textbox", { name: "Frage", exact: true }).fill("Wo ist der nächste Taxistandplatz bei mir?");
  await form.getByRole("textbox", { name: "Antwort A" }).fill("Hauptbahnhof, Ausgang Süd");
  await form.getByTestId("question-save").click();
  await expect(page.locator('[data-testid^="my-card-"]').filter({ hasText: "EIGENE FRAGE" })).toContainText("Hauptbahnhof");

  // die geänderte Frage erscheint in der Kapitel-Story (Frage 1)
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("story-row").hover();
  const circle = page.locator(`[data-story-key="kap-${catId}"]`);
  await circle.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await circle.click();
  await page.getByTestId("story-viewer").click({ position: { x: 340, y: 200 } });
  await expect(page.getByTestId("story-question")).toHaveText(myText);
  await page.getByTestId("story-close").click();

  // 4) eigenes Kapitel mit Frage → eigener Story-Kreis
  await page.goto("/lernbuch/eigene");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("my-new-chapter").fill("Meine Notizen");
  await page.getByTestId("my-new-chapter-btn").click();
  await page.waitForURL(/\/lernbuch\/eigene\/u-/);
  await page.getByTestId("my-add-question").click();
  const f2 = page.getByTestId("my-new-question");
  await f2.getByRole("textbox", { name: "Frage", exact: true }).fill("Welche Nummer hat die Taxizentrale?");
  await f2.getByRole("textbox", { name: "Antwort A" }).fill("40100");
  await f2.getByTestId("question-save").click();
  await expect(page.locator('[data-testid^="my-card-"]')).toHaveCount(1);
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  await expect(page.locator('[data-story-key^="kap-u-"]')).toBeAttached();

  // eigenes Kapitel löschen
  await page.goto("/lernbuch/eigene");
  await page.waitForLoadState("networkidle");
  await page.locator('[data-testid^="my-chapter-"]').first().click();
  await page.getByTestId("my-chapter-delete").click();
  await page.waitForURL("**/lernbuch/eigene");
  await expect(page.locator('[data-testid^="my-chapter-"]')).toHaveCount(0);
});
