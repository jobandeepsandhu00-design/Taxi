import { expect, test, type Page } from "@playwright/test";

async function guest(page: Page) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /Als Gast testen/ }).click();
  await page.waitForURL("**/willkommen");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Taxilenker:in" }).click();
  await page.getByRole("button", { name: /Weiter/ }).click();
  await page.getByLabel("Mein Termin steht noch nicht fest").check();
  await page.getByRole("button", { name: /Weiter/ }).click();
  await page.getByRole("radio", { name: /20/ }).click();
  await page.getByRole("button", { name: /Los geht/ }).click();
  await page.waitForURL("**/dashboard");
  await page.waitForLoadState("networkidle");
}

const html = (page: Page) => page.evaluate(() => ({ theme: document.documentElement.dataset.theme, dark: document.documentElement.classList.contains("dark") }));

test("Theme-Engine: Standard Wiener Weiß, Wechsel, Dunkelmodus, Speicherung im Profil", async ({ page }) => {
  await guest(page);
  expect(await html(page)).toEqual({ theme: "weiss", dark: false });
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(255, 255, 255)");

  await page.goto("/profil");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("radio", { name: "Design Wiener Weiß" })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("radio", { name: "Design Schönbrunn Gold" }).click();
  await expect.poll(async () => (await html(page)).theme).toBe("gold");
  await page.getByRole("radio", { name: "Dunkel" }).click();
  await expect.poll(async () => (await html(page)).dark).toBe(true);
  await page.waitForTimeout(800);

  // Kein Aufblitzen: schon im ersten HTML-Zustand korrekt (Head-Skript)
  await page.reload();
  expect(await html(page)).toEqual({ theme: "gold", dark: true });

  // Gerät ohne lokale Auswahl → Design kommt aus dem Profil
  await page.evaluate(() => localStorage.clear());
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  await expect.poll(() => html(page)).toEqual({ theme: "gold", dark: true });

  // Animationen reduzieren
  await page.goto("/profil");
  await page.waitForLoadState("networkidle");
  await page.getByRole("switch", { name: "Animationen reduzieren" }).click();
  await page.reload();
  expect(await page.evaluate(() => document.documentElement.classList.contains("reduce-motion"))).toBe(true);
});
