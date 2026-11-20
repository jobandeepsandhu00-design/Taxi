import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
// Einmal pro Testlauf festlegen – bleibt auch bei Worker-Neustarts nach Fehlschlägen gleich
process.env.E2E_RUN_ID ??= Date.now().toString(36);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 1,
  use: {
    baseURL: `http://localhost:${PORT}`,
    launchOptions: {
      ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}),
      // Mündliche Prüfung: simuliertes Mikrofon ohne Berechtigungsdialog
      args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
    },
  },
  webServer: {
    command: `npx next start -p ${PORT}`,
    port: PORT,
    reuseExistingServer: true,
    timeout: 120_000,
    // KI-Coach im Testmodus: deterministische Antworten ohne API-Aufrufe
    env: { ...process.env, COACH_FAKE: "1" } as Record<string, string>,
  },
});
