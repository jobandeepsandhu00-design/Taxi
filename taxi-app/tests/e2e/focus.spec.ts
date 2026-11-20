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

test("Fokus-Modus: Vollbild-Layout, Tasten, Wischen, Zurück-Taste, später weitermachen, Prüfung beenden", async ({ page }) => {
  await guest(page);
  await page.getByTestId("lesson-cta").getByRole("button").click();
  await page.waitForURL("**/quiz/**");
  await settle(page);

  // Kein App-Rahmen, keine Seite zum Scrollen
  await expect(page.getByTestId("focus-mode")).toBeVisible();
  await expect(page.getByRole("link", { name: /^Konto:/ })).toHaveCount(0);
  const scrolls = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 1);
  expect(scrolls).toBe(false);

  // Tastatur: B wählt, F markiert, → weiter, ← zurück
  await page.keyboard.press("b");
  await expect(page.getByRole("radiogroup", { name: "Antwortmöglichkeiten" }).getByRole("radio").nth(1)).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("f");
  await expect(page.getByRole("button", { name: "Markierung entfernen" })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("Frage 2 / 5")).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByText("Frage 1 / 5")).toBeVisible();

  // Wischen nach links = nächste Frage
  const q = page.getByTestId("focus-question");
  await expect(q).toHaveCount(1);
  const box = (await q.boundingBox())!;
  await page.mouse.move(box.x + box.width - 20, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 20, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(page.getByText("Frage 2 / 5")).toBeVisible();

  // Zurück-Taste des Browsers → Dialog statt Verlassen
  await page.goBack();
  await expect(page.getByRole("alertdialog", { name: "Sitzung verlassen?" })).toBeVisible();
  await page.getByRole("button", { name: "Später weitermachen" }).click();
  await page.waitForURL("**/dashboard");

  // Prüfung: ✕ → „Prüfung wirklich beenden?“ → Beenden
  await page.goto("/pruefung");
  await settle(page);
  await page.getByRole("button", { name: /Prüfung starten/ }).last().click();
  await page.waitForURL("**/quiz/**");
  await settle(page);
  await page.getByRole("button", { name: "Prüfung beenden" }).click();
  const dlg = page.getByRole("alertdialog", { name: "Prüfung wirklich beenden?" });
  await expect(dlg).toContainText("Dein Fortschritt geht verloren.");
  await dlg.getByRole("button", { name: "Beenden" }).click();
  await page.waitForURL("**/pruefung");
});
