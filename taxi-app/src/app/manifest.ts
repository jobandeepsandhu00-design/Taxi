import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "TaxiFit – Taxi-Prüfung Wien",
    short_name: "TaxiFit",
    description: "Lerne für die Taxilenker- und Konzessionsprüfung in Wien",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    theme_color: "#FFC400",
    background_color: "#FFFFFF",
    lang: "de-AT",
    dir: "ltr",
    categories: ["education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/badge-96.png", sizes: "96x96", type: "image/png", purpose: "monochrome" },
    ],
    shortcuts: [
      { name: "Quiz starten", short_name: "Quiz", url: "/quiz/start?type=schriftlich&mode=mini&source=shortcut", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Fällige Fragen", short_name: "Fällig", url: "/ueben/wiederholung?source=shortcut", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Weiterlesen", short_name: "Lernbuch", url: "/lernbuch/weiter?source=shortcut", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Mündlich üben", short_name: "Mündlich", url: "/muendlich?source=shortcut", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
    screenshots: [
      { src: "/screenshots/home.png", sizes: "1080x1920", type: "image/png", form_factor: "narrow", label: "Startseite mit Lernfortschritt" },
      { src: "/screenshots/quiz.png", sizes: "1080x1920", type: "image/png", form_factor: "narrow", label: "Quiz mit Prüfungsfragen" },
      { src: "/screenshots/lernbuch.png", sizes: "1080x1920", type: "image/png", form_factor: "narrow", label: "Lernbuch Kapitel für Kapitel" },
    ],
  };
}
