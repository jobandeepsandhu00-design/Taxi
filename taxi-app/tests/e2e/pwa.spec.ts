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

const IPHONE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const ANDROID_UA = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const INSTAGRAM_UA = `${IPHONE_UA} Instagram 300.0.0.0`;

test("Manifest, Icons, Startbildschirme und iOS-Meta-Tags", async ({ request, page }) => {
  const m = await (await request.get("/manifest.webmanifest")).json();
  expect(m.short_name).toBe("TaxiFit");
  expect(m.start_url).toBe("/?source=pwa");
  expect(m.id).toBe("/");
  expect(m.theme_color).toBe("#FFC400");
  expect(m.display_override).toEqual(["standalone", "minimal-ui"]);
  expect(m.icons.filter((i: { purpose?: string }) => i.purpose === "maskable")).toHaveLength(2);
  expect(m.shortcuts.map((s: { name: string }) => s.name)).toEqual(["Quiz starten", "Fällige Fragen", "Weiterlesen", "Mündlich üben"]);
  for (const i of m.icons) expect((await request.get(i.src)).status()).toBe(200);
  for (const s of m.screenshots) expect((await request.get(s.src)).status()).toBe(200);
  expect((await request.get("/icons/apple-touch-icon.png")).status()).toBe(200);

  await page.goto("/login");
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute("content", "yes");
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute("content", "TaxiFit");
  expect(await page.locator('link[rel="apple-touch-startup-image"]').count()).toBeGreaterThanOrEqual(10);
  const splash = await page.locator('link[rel="apple-touch-startup-image"]').first().getAttribute("href");
  expect((await request.get(splash!)).status()).toBe(200);
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute("content", /viewport-fit=cover/);
});

test("Cron-Route ist geschützt", async ({ request }) => {
  expect((await request.get("/api/cron/push")).status()).toBe(401);
  const ok = await request.get("/api/cron/push?job=weekly", { headers: { authorization: `Bearer ${process.env.E2E_CRON_SECRET}` } });
  expect(ok.status()).toBe(200);
  expect((await ok.json()).results[0].job).toBe("weekly");
});

test.describe("iPhone (Safari)", () => {
  test.use({ viewport: { width: 390, height: 844 }, userAgent: IPHONE_UA, isMobile: true, hasTouch: true });
  test("Installieren-Chip, Profil-Eintrag und animierte iPhone-Anleitung", async ({ page }) => {
    await guest(page);
    await expect(page.getByTestId("install-chip")).toBeVisible();
    await page.goto("/profil");
    await settle(page);
    await page.getByTestId("profil-install").click();
    const sheet = page.getByTestId("install-sheet");
    await expect(sheet.getByText("App auf dem iPhone installieren")).toBeVisible();
    await expect(sheet.getByTestId("ios-step-1")).toBeVisible();
    await sheet.getByTestId("ios-step-2").click();
    await expect(sheet.getByText("Zum Home-Bildschirm", { exact: true }).first()).toBeVisible();
    await expect(sheet.getByText(/nur in der installierten App/)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();

    // Benachrichtigungen: Hinweis, dass auf dem iPhone die installierte App nötig ist
    await page.getByTestId("profil-notifications").click();
    await expect(page.getByTestId("notif-status")).toContainText("installierten App");
  });
});

test.describe("In-App-Browser", () => {
  test.use({ viewport: { width: 390, height: 844 }, userAgent: INSTAGRAM_UA, isMobile: true, hasTouch: true });
  test("Instagram: Bitte im Browser öffnen", async ({ page }) => {
    await guest(page);
    await page.goto("/profil");
    await settle(page);
    await page.getByTestId("profil-install").click();
    await expect(page.getByTestId("install-sheet").getByText("Bitte im Browser öffnen")).toBeVisible();
  });
});

test.describe("Android (Chrome)", () => {
  test.use({ viewport: { width: 412, height: 915 }, userAgent: ANDROID_UA, isMobile: true, hasTouch: true });
  test("eigener Installations-Dialog über beforeinstallprompt, danach Danke-Toast", async ({ page }) => {
    await guest(page);
    await expect(page.getByTestId("install-chip")).toBeHidden();
    await page.evaluate(() => {
      const e = new Event("beforeinstallprompt", { cancelable: true }) as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
      (window as unknown as { __prompted: number }).__prompted = 0;
      e.prompt = async () => {
        (window as unknown as { __prompted: number }).__prompted++;
      };
      e.userChoice = Promise.resolve({ outcome: "accepted" });
      window.dispatchEvent(e);
    });
    await page.getByTestId("install-chip").click();
    const sheet = page.getByTestId("install-sheet");
    await expect(sheet.getByText("TaxiFit installieren")).toBeVisible();
    await expect(sheet.getByText("Offline lernen")).toBeVisible();
    await sheet.getByTestId("install-confirm").click();
    await expect(page.getByText("TaxiFit ist jetzt installiert")).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __prompted: number }).__prompted)).toBe(1);
  });

  test("Vorab-Frage für Erinnerungen nach einem bedeutsamen Moment, „Später“ sperrt 7 Tage", async ({ page }) => {
    await guest(page);
    // Moment simulieren: vorher 0 erledigte Lektionen, Serie 0 – jetzt Prüfungstermin gesetzt
    await page.evaluate(() => {
      localStorage.setItem("tp-pwa-auto", "1");
      localStorage.setItem("tp-first-seen", "1");
      localStorage.setItem("tp-moment-state", JSON.stringify({ done: 0, exam: false, streak: 0 }));
    });
    await page.goto("/profil");
    await settle(page);
    await page.locator('input[name="targetExamDate"]').fill("2027-06-30");
    await page.getByRole("button", { name: /Speichern/ }).first().click();
    await settle(page);
    await page.goto("/dashboard");
    const ask = page.getByTestId("push-ask");
    await expect(ask.getByText("Soll ich dich ans Lernen erinnern?")).toBeVisible({ timeout: 15_000 });
    await ask.getByTestId("push-ask-later").click();
    await expect(ask).toBeHidden();
    const gate = await page.evaluate(() => JSON.parse(localStorage.getItem("tp-gate-push") ?? "{}"));
    expect(gate.n).toBe(1);
    expect(gate.until).toBeGreaterThan(Date.now() + 6 * 86400_000);
  });
});

test("Benachrichtigungs-Einstellungen speichern, Test-Push ohne Gerät, Profil-Link", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await guest(page);
  await page.goto("/profil");
  await settle(page);
  await page.getByTestId("profil-notifications").click();
  await page.waitForURL("**/profil/benachrichtigungen");
  await settle(page);
  await expect(page.getByTestId("notif-master")).toBeVisible();
  const streak = page.getByTestId("notif-streakAlerts");
  await expect(streak).toHaveAttribute("aria-checked", "true");
  await streak.click();
  await page.getByTestId("notif-time").fill("19:45");
  await page.waitForTimeout(800);
  await page.reload();
  await settle(page);
  await expect(page.getByTestId("notif-streakAlerts")).toHaveAttribute("aria-checked", "false");
  await expect(page.getByTestId("notif-time")).toHaveValue("19:45");
  await page.getByTestId("notif-test").click();
  await expect(page.getByText("noch kein Gerät angemeldet")).toBeVisible();
  await expect(page.getByTestId("notif-devices")).toContainText("Noch kein Gerät");
});
