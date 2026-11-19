import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TaxiPrüfung Österreich",
    short_name: "TaxiPrüfung",
    description: "Lern- und Quiz-App zur Vorbereitung auf die Taxi-Prüfung in Österreich (Wien).",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0f1a",
    theme_color: "#0b0f1a",
    lang: "de-AT",
    categories: ["education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Lernen starten", url: "/lernen" },
      { name: "Prüfungsmodus", url: "/pruefung" },
      { name: "Falsche Antworten", url: "/fehler" },
    ],
  };
}
