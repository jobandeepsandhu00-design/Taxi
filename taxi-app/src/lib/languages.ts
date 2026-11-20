/** Hilfssprachen für die Übersetzungshilfe (konfigurierbar). */
export const HELPER_LANGS = [
  { code: "en", label: "English", name: "Englisch" },
  { code: "tr", label: "Türkçe", name: "Türkisch" },
  { code: "ar", label: "العربية", name: "Arabisch", rtl: true },
  { code: "fa", label: "فارسی", name: "Persisch (Farsi)", rtl: true },
  { code: "pa", label: "ਪੰਜਾਬੀ", name: "Panjabi" },
  { code: "ro", label: "Română", name: "Rumänisch" },
  { code: "pl", label: "Polski", name: "Polnisch" },
  { code: "bs", label: "BCS", name: "Bosnisch/Kroatisch/Serbisch" },
  { code: "ru", label: "Русский", name: "Russisch" },
  { code: "uk", label: "Українська", name: "Ukrainisch" },
  { code: "ur", label: "اردو", name: "Urdu", rtl: true },
  { code: "hi", label: "हिन्दी", name: "Hindi" },
] as const;

export type HelperLang = (typeof HELPER_LANGS)[number]["code"];

export function isHelperLang(v: unknown): v is HelperLang {
  return typeof v === "string" && HELPER_LANGS.some((l) => l.code === v);
}

export function langInfo(code: string) {
  return HELPER_LANGS.find((l) => l.code === code) ?? HELPER_LANGS[0];
}

export function isRtl(code: string): boolean {
  return Boolean((langInfo(code) as { rtl?: boolean }).rtl);
}
