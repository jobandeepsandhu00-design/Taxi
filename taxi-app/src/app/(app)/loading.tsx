/** Sofortige Rückmeldung beim Seitenwechsel – erscheint erst nach kurzer Verzögerung, damit schnelle Wechsel nicht flackern. */
export default function Loading() {
  return (
    <div className="tp-skeleton space-y-4" aria-busy="true" aria-label="Wird geladen" role="status">
      <div className="h-8 w-48 rounded-xl bg-foreground/[0.07]" />
      <div className="h-4 w-72 max-w-full rounded-lg bg-foreground/[0.05]" />
      <div className="h-36 rounded-3xl bg-foreground/[0.06]" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="h-28 rounded-3xl bg-foreground/[0.05]" />
        <div className="h-28 rounded-3xl bg-foreground/[0.05]" />
      </div>
      <div className="h-24 rounded-3xl bg-foreground/[0.05]" />
      <span className="sr-only">Wird geladen …</span>
    </div>
  );
}
