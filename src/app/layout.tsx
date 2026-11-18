import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "TaxiPrüfung Österreich – Lernen für die Taxi-Prüfung in Wien", template: "%s · TaxiPrüfung" },
  description:
    "Strukturierte Vorbereitung auf die Taxi-Prüfung in Österreich (Wien): Lernmodus, Übungsquiz, Prüfungssimulation, Fehlertraining, Lernkarten und Fortschrittsanalyse.",
  applicationName: "TaxiPrüfung",
  appleWebApp: { capable: true, title: "TaxiPrüfung", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#0b1f4b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de-AT" className={inter.variable}>
      <body className="font-sans">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
