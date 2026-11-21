import { expect, test, type Page } from "@playwright/test";

/** Phase „Easy Learning“: Lektionen, Leitner, Prüfungsreife, Warum?, Einfach/Übersetzung, Zahlen, Routen. */

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

const options = (page: Page) => page.getByRole("radiogroup", { name: "Antwortmöglichkeiten" }).or(page.getByRole("group", { name: "Antwortmöglichkeiten" }));

test.describe.serial("Easy Learning", () => {
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.addLocatorHandler(page.locator('[aria-labelledby="celebration-title"]'), async (d) => {
      await d.getByRole("button").click();
    });
    await guest(page);
  });
  test.afterAll(async () => page.close());

  test("Mini-Lektion: 5 Fragen, Unsicher-Schalter, Fach-Hinweis, kurzes Ergebnis", async () => {
    await page.getByTestId("lesson-cta").getByRole("button").click();
    await page.waitForURL("**/quiz/**");
    await settle(page);
    await expect(page.getByRole("heading", { name: "3-Minuten-Lektion" })).toBeVisible();
    await expect(page.getByTestId("focus-mode")).toBeVisible();
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuemax", "5");
    for (let i = 0; i < 5; i++) {
      await options(page).locator("button").first().click();
      if (i === 0) {
        await page.getByRole("switch", { name: /Unsicher/ }).click();
        await expect(page.getByRole("switch", { name: /Unsicher/ })).toHaveAttribute("aria-checked", "true");
      }
      await page.getByRole("button", { name: "Antwort prüfen" }).click();
      await expect(page.getByText(/^(Richtig!|Leider falsch)$/)).toBeVisible();
      if (i === 0) await expect(page.getByLabel(/^Karteikasten:/)).toBeVisible();
      await page.getByTestId("focus-primary").click();
    }
    const result = page.getByTestId("lesson-result");
    await expect(result).toBeVisible();
    await expect(result.getByText(/^\/5$/)).toBeVisible();
    await expect(result.getByRole("button", { name: /Noch eine\?/ })).toBeVisible();
    await result.getByRole("link", { name: /Für heute fertig/ }).click();
    await page.waitForURL("**/dashboard");
  });

  test("Kategorie-Lektionen mit Status", async () => {
    await page.goto("/lernen");
    await settle(page);
    await page.locator('main a[href^="/lernen/"]').first().click();
    await settle(page);
    const first = page.getByRole("button", { name: /^Lektion 1 starten/ });
    await expect(first).toBeVisible();
    await first.click();
    await page.waitForURL("**/quiz/**");
    await expect(page.getByRole("heading", { name: /^Lektion 1 ·/ })).toBeVisible();
  });

  test("Prüfungsreife: Detailseite, Aufschlüsselung, Formel-Erklärung", async () => {
    await page.goto("/fortschritt/reife");
    await settle(page);
    await expect(page.getByRole("img", { name: /Prüfungsreife \d+ von 100/ })).toBeVisible();
    const breakdown = page.getByRole("region", { name: "Aufschlüsselung" });
    for (const f of ["Abdeckung", "Beherrschung", "Trefferquote", "Prüfungen"]) await expect(breakdown.getByText(new RegExp(`^${f}`)).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Lektion starten/ }).first()).toBeVisible();
    await expect(page.getByTestId("readiness-prognosis")).toContainText(/5 Lerntage|prüfungsbereit/);
    await page.getByRole("button", { name: "Wie wird das berechnet?" }).click();
    await expect(page.getByRole("dialog")).toContainText("35 % Beherrschung");
  });

  test("Einfach (B1) mit Glossar, Übersetzungshilfe und strukturiertes „Warum?“", async () => {
    await page.evaluate(() => localStorage.setItem("tp-lang", "en"));
    await page.goto("/fragen/bbb-04");
    await settle(page);
    // Glossar aus dem Cache: Fachbegriff im Originaltext antippen
    await page.getByRole("button", { name: "Eigenkapital", exact: true }).first().click();
    await expect(page.getByRole("tooltip")).toContainText("nicht geliehen");
    await page.keyboard.press("Escape");
    // Einfache Sprache (vorab erzeugt, ungeprüft)
    await page.getByRole("button", { name: "Einfache Sprache" }).click();
    await expect(page.getByText("Wie berechnest du das Eigenkapital einer Firma?")).toBeVisible();
    await expect(page.getByText("Ungeprüft").first()).toBeVisible();
    await page.getByRole("button", { name: "Einfache Sprache" }).click();
    // Übersetzungshilfe
    await page.getByRole("button", { name: "Übersetzungshilfe öffnen" }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByText(/Die Prüfung ist auf Deutsch/)).toBeVisible();
    await expect(sheet.getByTestId("translation")).toContainText("How do you calculate equity");
    // RTL für Arabisch (Testmodus erzeugt die Übersetzung)
    await sheet.getByRole("radio", { name: "العربية" }).click();
    await expect(sheet.getByTestId("translation")).toHaveAttribute("dir", "rtl");
    await sheet.getByRole("button", { name: "Schließen" }).last().click();
    await expect(sheet).toHaveCount(0);
    // falsch antworten (A) → Warum?
    await options(page).getByRole("radio").first().click();
    await page.getByRole("button", { name: "Antwort prüfen" }).click();
    await expect(page.getByText("Leider falsch", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: /Warum\? – Coach erklären lassen/ }).click();
    const why = page.getByTestId("why-panel");
    await expect(why.getByText("Die Regel")).toBeVisible();
    await expect(why.getByText("Beispiel aus dem Taxi-Alltag")).toBeVisible();
    await expect(why.getByText(/Warum war deine Antwort \(A\) falsch\?/)).toBeVisible();
    await why.getByRole("button", { name: /Erklärung nicht hilfreich/ }).click();
    await expect(why.getByText("Danke – wir prüfen die Erklärung.")).toBeVisible();
    await expect(why.getByRole("button", { name: "Auf العربية erklären" })).toBeVisible();
  });

  test("Zahlen-Trainer: Auswahl-Runde, Blitz-Runde, Spickzettel", async () => {
    await page.goto("/zahlen/ueben?typ=auswahl");
    await settle(page);
    for (let i = 0; i < 10; i++) {
      await page.getByRole("radiogroup", { name: "Werte" }).getByRole("radio").first().click();
      await expect(page.getByText(/Richtig!|Leider falsch – richtig ist:/)).toBeVisible();
      await page.getByRole("button", { name: /Weiter|Ergebnis anzeigen/ }).click();
    }
    await expect(page.getByTestId("number-result")).toBeVisible();

    await page.goto("/zahlen/ueben?typ=blitz");
    await settle(page);
    await expect(page.getByRole("timer")).toBeVisible();
    await page.getByRole("button", { name: "Stimmt ✓" }).click();
    await expect(page.getByText(/^Punkte:/)).toBeVisible();

    await page.goto("/zahlen/spickzettel");
    await settle(page);
    await expect(page.getByRole("heading", { name: "Zahlen-Spickzettel" })).toBeVisible();
    await expect(page.getByText(/ungeprüft/)).toBeVisible();
  });

  test("Routen in Etappen: Anschauen, eine Lücke, mehrere Lücken, Reihenfolge", async () => {
    await page.goto("/ortskunde/routen");
    await settle(page);
    await page.getByRole("link", { name: /Schwarzenbergplatz → Schwedenplatz/ }).click();
    await settle(page);
    await expect(page.getByText("Von:")).toBeVisible();
    const stage1 = ["Kärntner Ring", "Opernring", "Burgring", "Dr.-Karl-Renner-Ring"];

    // Stufe 1
    await page.getByRole("button", { name: /Angeschaut – weiter/ }).click();
    await expect(page.getByTestId("route-success")).toBeVisible();
    await page.getByRole("button", { name: "Weiter" }).click();

    // Stufe 2: fehlende Straße wählen
    const chips = page.getByRole("group", { name: "Welche Straße fehlt?" }).getByRole("button");
    await expect(chips).toHaveCount(4);
    const texts = await chips.allInnerTexts();
    const listText = await page.locator("ol").first().innerText();
    const answer = texts.find((t) => stage1.includes(t.trim()) && !listText.includes(t.trim()))!;
    await chips.filter({ hasText: answer }).click();
    await expect(page.getByTestId("route-success")).toBeVisible();
    await page.getByRole("button", { name: "Weiter" }).click();

    // Stufe 3: Straße antippen, dann passende Lücke
    const gaps = page.getByRole("button", { name: /^Lücke \d+/ });
    await expect(gaps.first()).toBeVisible();
    const n = await gaps.count();
    expect(n).toBe(2);
    for (let k = 0; k < n; k++) {
      const label = (await page.getByRole("button", { name: /^Lücke \d+$/ }).first().getAttribute("aria-label"))!;
      const idx = Number(label.match(/\d+/)![0]) - 1;
      await page.getByRole("group", { name: "Fehlende Straßen" }).getByRole("button", { name: stage1[idx], exact: true }).click();
      await page.getByRole("button", { name: new RegExp(`^Lücke ${idx + 1}`) }).click();
    }
    await expect(page.getByTestId("route-success")).toBeVisible();
    await page.getByRole("button", { name: "Weiter" }).click();

    // Stufe 4: mit „nach oben“ sortieren
    await expect(page.getByRole("list", { name: /richtige Reihenfolge/ }).locator("li")).toHaveCount(stage1.length);
    for (let target = 0; target < stage1.length; target++) {
      const items = page.getByRole("list", { name: /richtige Reihenfolge/ }).locator("li");
      const current = (await items.allInnerTexts()).map((t) => t.replace(/^\d+\s*/, "").trim());
      let pos = current.findIndex((t) => t.startsWith(stage1[target]));
      while (pos > target) {
        await page.getByRole("button", { name: `${stage1[target]} nach oben` }).click();
        pos--;
      }
    }
    await page.getByRole("button", { name: "Reihenfolge prüfen" }).click();
    await expect(page.getByTestId("route-success")).toBeVisible();
  });
});
