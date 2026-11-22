import { defineConfig } from "@playwright/test";
import { generateVAPIDKeys } from "web-push";

const PORT = Number(process.env.E2E_PORT ?? 3100);
// Einmal pro Testlauf festlegen – bleibt auch bei Worker-Neustarts nach Fehlschlägen gleich
process.env.E2E_RUN_ID ??= Date.now().toString(36);
// Push: Wegwerf-Schlüssel nur für den Testserver
if (!process.env.E2E_VAPID_PUBLIC) {
  const k = generateVAPIDKeys();
  process.env.E2E_VAPID_PUBLIC = k.publicKey;
  process.env.E2E_VAPID_PRIVATE = k.privateKey;
}
process.env.E2E_CRON_SECRET ??= `cron-${process.env.E2E_RUN_ID}`;

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
      args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required"],
    },
  },
  webServer: {
    command: `npx next start -p ${PORT}`,
    port: PORT,
    reuseExistingServer: true,
    timeout: 120_000,
    // KI-Coach im Testmodus: deterministische Antworten ohne API-Aufrufe
    // Audio: Test-Anbieter (kurzer Ton statt Stimme), Dateien lokal unter .data/audio
    env: { ...process.env, COACH_FAKE: "1", TTS_PROVIDER: "fake", VAPID_PUBLIC_KEY: process.env.E2E_VAPID_PUBLIC!, VAPID_PRIVATE_KEY: process.env.E2E_VAPID_PRIVATE!, CRON_SECRET: process.env.E2E_CRON_SECRET! } as Record<string, string>,
  },
});
