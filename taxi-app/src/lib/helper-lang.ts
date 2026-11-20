"use client";

import { isHelperLang, type HelperLang } from "./languages";

/** Gewählte Hilfssprache (lokal; mit dem Profil abgeglichen). */
export function getHelperLang(): HelperLang | null {
  try {
    const v = localStorage.getItem("tp-lang");
    return isHelperLang(v) ? v : null;
  } catch {
    return null;
  }
}

export function storeHelperLang(code: HelperLang) {
  try {
    localStorage.setItem("tp-lang", code);
  } catch {
    /* ignorieren */
  }
}
