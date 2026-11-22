/** Zahlen → deutsche Zahlwörter (für die Sprachausgabe). */
const ONES = ["null", "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn", "elf", "zwölf", "dreizehn", "vierzehn", "fünfzehn", "sechzehn", "siebzehn", "achtzehn", "neunzehn"];
const TENS = ["", "", "zwanzig", "dreißig", "vierzig", "fünfzig", "sechzig", "siebzig", "achtzig", "neunzig"];

function below100(n: number, final = true): string {
  if (n < 20) return n === 1 && !final ? "ein" : ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o === 0 ? TENS[t] : `${o === 1 ? "ein" : ONES[o]}und${TENS[t]}`;
}

function below1000(n: number, final = true): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const head = h ? `${h === 1 ? "ein" : ONES[h]}hundert` : "";
  if (r === 0) return head || (final ? "null" : "");
  return head + below100(r, final);
}

/** Ganze Zahl (0 … 999 999 999 999) als Wort, z. B. 700000 → „siebenhunderttausend“. */
export function intToWords(n: number): string {
  if (!Number.isFinite(n)) return String(n);
  if (n < 0) return `minus ${intToWords(-n)}`;
  n = Math.floor(n);
  if (n === 0) return "null";
  const parts: string[] = [];
  const billions = Math.floor(n / 1e9);
  const millions = Math.floor((n % 1e9) / 1e6);
  const thousands = Math.floor((n % 1e6) / 1e3);
  const rest = n % 1e3;
  if (billions) parts.push(billions === 1 ? "eine Milliarde" : `${below1000(billions)} Milliarden`);
  if (millions) parts.push(millions === 1 ? "eine Million" : `${below1000(millions)} Millionen`);
  let tail = "";
  if (thousands) tail += `${below1000(thousands, false)}tausend`;
  if (rest) tail += below1000(rest, true);
  if (tail) parts.push(tail);
  return parts.join(" ");
}

/** Jahreszahl: 1990 → „neunzehnhundertneunzig“, 2025 → „zweitausendfünfundzwanzig“. */
export function yearToWords(y: number): string {
  if (y >= 1100 && y < 2000) {
    const h = Math.floor(y / 100);
    const r = y % 100;
    return `${below100(h)}hundert${r ? below100(r) : ""}`;
  }
  return intToWords(y);
}

/** Ordnungszahl (Nominativ, männlich): 1 → „erster“, 3 → „dritter“, 20 → „zwanzigster“. */
export function ordinalToWords(n: number): string {
  const special: Record<number, string> = { 1: "erster", 3: "dritter", 7: "siebter", 8: "achter" };
  if (special[n]) return special[n];
  const w = intToWords(n);
  return n < 20 ? `${w}ter` : `${w}ster`;
}

/** Dezimalzahl mit Komma: „0,1“ → „null Komma eins“, „2,5“ → „zwei Komma fünf“. */
export function decimalToWords(raw: string): string {
  const [int, frac] = raw.replace(/[.\s]/g, "").split(",");
  const head = intToWords(Number(int || "0"));
  if (!frac) return head;
  const digits = frac.length <= 2 && !frac.startsWith("0") ? intToWords(Number(frac)) : frac.split("").map((d) => ONES[Number(d)]).join(" ");
  return `${head} Komma ${digits}`;
}

export const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
