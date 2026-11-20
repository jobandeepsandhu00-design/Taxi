import type { Metadata, Viewport } from "next";
import { Inter, Nunito, Playfair_Display, Plus_Jakarta_Sans, Sora, Space_Grotesk } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import { CityBackground } from "@/components/motion/city-background";
import { MotionProvider } from "@/components/motion/motion-provider";
import { TapRipple } from "@/components/motion/tap-ripple";
import { THEME_HEAD_SCRIPT } from "@/lib/theme/script";
import { buildThemeCss } from "@/lib/theme/css";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });
const grotesk = Space_Grotesk({ subsets: ["latin", "latin-ext"], variable: "--font-grotesk", display: "swap" });
// Theme-Schriften: nicht vorladen – nur das aktive Theme lädt sie tatsächlich
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin", "latin-ext"], variable: "--font-jakarta", display: "swap", preload: false });
const nunito = Nunito({ subsets: ["latin", "latin-ext"], variable: "--font-nunito", display: "swap", preload: false });
const playfair = Playfair_Display({ subsets: ["latin", "latin-ext"], variable: "--font-playfair", display: "swap", preload: false });
const sora = Sora({ subsets: ["latin", "latin-ext"], variable: "--font-sora", display: "swap", preload: false });
const fontVars = [inter, grotesk, jakarta, nunito, playfair, sora].map((f) => f.variable).join(" ");
const themeCss = buildThemeCss();

export const metadata: Metadata = {
  title: { default: "TaxiFit – Lernen für die Taxi-Prüfung in Wien", template: "%s · TaxiFit" },
  description:
    "Strukturierte Vorbereitung auf die Taxi-Prüfung in Österreich (Wien): Lernmodus, Übungsquiz, Prüfungssimulation, Fehlertraining, Lernkarten und Fortschrittsanalyse.",
  applicationName: "TaxiFit",
  appleWebApp: { capable: true, title: "TaxiFit", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de-AT" data-theme="weiss" className={fontVars} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_HEAD_SCRIPT }} />
        <style id="theme-tokens" dangerouslySetInnerHTML={{ __html: themeCss }} />
      </head>
      <body className="font-sans">
        <CityBackground />
        <MotionProvider>{children}</MotionProvider>
        <TapRipple />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
