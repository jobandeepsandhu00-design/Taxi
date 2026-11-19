/** Gemeinsames Demo-Konto für den „Demo ausprobieren"-Zugang. */
export const DEMO_EMAIL = "demo@taxi-pruefung.at";

/** Demo-Zugang ist aktiv, solange DEMO_LOGIN_ENABLED nicht auf "false" steht. */
export function isDemoLoginEnabled(): boolean {
  return process.env.DEMO_LOGIN_ENABLED !== "false";
}

export function isDemoEmail(email: string | null | undefined): boolean {
  return email?.toLowerCase() === DEMO_EMAIL;
}
