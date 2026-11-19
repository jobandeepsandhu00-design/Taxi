import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import { CityBackground } from "@/components/motion/city-background";
import { MotionProvider } from "@/components/motion/motion-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
const grotesk = Space_Grotesk({ subsets: ["latin", "latin-ext"], variable: "--font-grotesk", display: "swap" });

export const metadata: Metadata = {
  title: { default: "TaxiPrüfung Österreich – Lernen für die Taxi-Prüfung in Wien", template: "%s · TaxiPrüfung" },
  description:
    "Strukturierte Vorbereitung auf die Taxi-Prüfung in Österreich (Wien): Lernmodus, Übungsquiz, Prüfungssimulation, Fehlertraining, Lernkarten und Fortschrittsanalyse.",
  applicationName: "TaxiPrüfung",
  appleWebApp: { capable: true, title: "TaxiPrüfung", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0f1a" },
    { media: "(prefers-color-scheme: light)", color: "#faf7f0" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/** Setzt das Farbschema vor dem ersten Rendern (Standard: „Wien bei Nacht"). */
const themeScript = `(function(){try{var t=localStorage.getItem('tp-theme');var d=t?t==='dark':true;document.documentElement.classList.toggle('dark',d);}catch(e){document.documentElement.classList.add('dark');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de-AT" className={`${inter.variable} ${grotesk.variable} dark`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans">
        <CityBackground />
        <MotionProvider>{children}</MotionProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
