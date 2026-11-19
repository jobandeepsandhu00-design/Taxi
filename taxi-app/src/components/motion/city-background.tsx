/** Animierter Hintergrund: langsam treibende Straßenlicht-Orbs und Filmkorn (nur GPU-Transforms). */
export function CityBackground() {
  return (
    <div className="city-bg" aria-hidden>
      <div className="orb orb-a" />
      <div className="orb orb-b" />
      <div className="orb orb-c" />
      <div className="grain" />
    </div>
  );
}
