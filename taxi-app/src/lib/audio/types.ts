/** Audio-Quellen einer Frage (öffentliche URLs) – geteilt zwischen Server und Client. */
export type AudioSrc = { mp3: string; opus?: string | null; ms: number };
export type QuestionAudioSet = Partial<Record<"question" | "answer" | "options" | "explanation", AudioSrc>>;
export type AudioMap = Record<string, QuestionAudioSet>;
