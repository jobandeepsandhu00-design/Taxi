/** Taxi- und Wien-Avatare (Emoji-basiert, keine Bilddateien nötig). */
export const AVATARS = [
  { key: "taxi", emoji: "🚕", label: "Taxi" },
  { key: "taxi-front", emoji: "🚖", label: "Taxi von vorne" },
  { key: "lenker", emoji: "🧑‍✈️", label: "Lenker:in" },
  { key: "kompass", emoji: "🧭", label: "Kompass" },
  { key: "karte", emoji: "🗺️", label: "Stadtplan" },
  { key: "riesenrad", emoji: "🎡", label: "Riesenrad" },
  { key: "dom", emoji: "⛪", label: "Stephansdom" },
  { key: "kaffee", emoji: "☕", label: "Wiener Melange" },
  { key: "torte", emoji: "🍰", label: "Sachertorte" },
  { key: "eule", emoji: "🦉", label: "Nachteule" },
  { key: "ampel", emoji: "🚦", label: "Ampel" },
  { key: "pokal", emoji: "🏆", label: "Pokal" },
] as const;

export function avatarEmoji(key: string | null | undefined): string | null {
  return AVATARS.find((a) => a.key === key)?.emoji ?? null;
}
