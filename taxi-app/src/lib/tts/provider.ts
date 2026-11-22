import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ssmlToPlain, wrapSsml } from "./prepare";

/**
 * TTS-Anbieter – nur serverseitig (Admin-Generierung). Schlüssel ausschließlich aus Umgebungsvariablen.
 * Auswahl über TTS_PROVIDER: azure (Standard) | google | elevenlabs | fake (Tests).
 */
export type AudioFormat = "mp3" | "opus";
export interface SynthesizeInput {
  /** SSML-Inhalt ohne <speak>/<voice> */
  ssml: string;
  voice: string;
  format: AudioFormat;
}
export interface SynthesizeResult {
  audio: Buffer;
  durationMs: number;
}
export interface TtsProvider {
  id: "azure" | "google" | "elevenlabs" | "fake";
  label: string;
  configured(): boolean;
  /** Standardstimmen (weiblich, männlich) */
  defaultVoices: { female: string; male: string };
  synthesize(input: SynthesizeInput): Promise<SynthesizeResult>;
}

/** Fehler mit HTTP-Status (für Retry-Entscheidung bei 429/5xx). */
export class TtsError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
  get retryable() {
    return this.status === 429 || this.status >= 500 || this.status === 0;
  }
}

const MPEG1_L3_KBPS = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
const MPEG2_L3_KBPS = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];

/** Dauer einer CBR-MP3 aus dem ersten Frame-Header (ID3 wird übersprungen). */
export function mp3DurationMs(buf: Buffer): number {
  let i = 0;
  if (buf.length > 10 && buf.toString("latin1", 0, 3) === "ID3") {
    const size = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
    i = 10 + size;
  }
  for (; i < buf.length - 4; i++) {
    if (buf[i] === 0xff && (buf[i + 1] & 0xe0) === 0xe0) {
      const version = (buf[i + 1] >> 3) & 0x03; // 3 = MPEG1
      const idx = (buf[i + 2] >> 4) & 0x0f;
      const kbps = (version === 3 ? MPEG1_L3_KBPS : MPEG2_L3_KBPS)[idx];
      if (!kbps) continue;
      return Math.round(((buf.length - i) * 8) / kbps);
    }
  }
  return 0;
}

async function http(url: string, init: RequestInit, label: string): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(45_000) });
  } catch (e) {
    throw new TtsError(`${label}: keine Verbindung (${e instanceof Error ? e.message : "Netzwerk"})`, 0);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new TtsError(`${label}: HTTP ${res.status} ${body.slice(0, 160)}`, res.status);
  }
  return res;
}

/* ── Azure Neural TTS (Standard) ── */
const azure: TtsProvider = {
  id: "azure",
  label: "Azure Neural TTS",
  defaultVoices: { female: "de-AT-IngridNeural", male: "de-AT-JonasNeural" },
  configured: () => Boolean(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION),
  async synthesize({ ssml, voice, format }) {
    const region = process.env.AZURE_SPEECH_REGION!;
    const lang = voice.slice(0, 5);
    const res = await http(
      `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": process.env.AZURE_SPEECH_KEY!,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": format === "opus" ? "ogg-48khz-16bit-mono-opus" : "audio-48khz-96kbitrate-mono-mp3",
          "User-Agent": "taxifit-tts",
        },
        body: wrapSsml(ssml, voice, lang),
      },
      "Azure",
    );
    const audio = Buffer.from(await res.arrayBuffer());
    return { audio, durationMs: format === "mp3" ? mp3DurationMs(audio) : 0 };
  },
};

/* ── Google Cloud TTS ── */
const google: TtsProvider = {
  id: "google",
  label: "Google Cloud TTS",
  defaultVoices: { female: "de-DE-Neural2-F", male: "de-DE-Neural2-B" },
  configured: () => Boolean(process.env.GOOGLE_TTS_API_KEY),
  async synthesize({ ssml, voice, format }) {
    const res = await http(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(process.env.GOOGLE_TTS_API_KEY!)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { ssml: `<speak>${ssml}</speak>` },
          voice: { languageCode: voice.slice(0, 5), name: voice },
          audioConfig: { audioEncoding: format === "opus" ? "OGG_OPUS" : "MP3", sampleRateHertz: 48000, effectsProfileId: ["headphone-class-device"] },
        }),
      },
      "Google",
    );
    const json = (await res.json()) as { audioContent?: string };
    const audio = Buffer.from(json.audioContent ?? "", "base64");
    return { audio, durationMs: format === "mp3" ? mp3DurationMs(audio) : 0 };
  },
};

/* ── ElevenLabs (multilingual) ── */
const elevenlabs: TtsProvider = {
  id: "elevenlabs",
  label: "ElevenLabs",
  defaultVoices: { female: process.env.ELEVENLABS_VOICE_FEMALE ?? "", male: process.env.ELEVENLABS_VOICE_MALE ?? "" },
  configured: () => Boolean(process.env.ELEVENLABS_API_KEY && (process.env.ELEVENLABS_VOICE_FEMALE || process.env.ELEVENLABS_VOICE_MALE)),
  async synthesize({ ssml, voice, format }) {
    // ElevenLabs versteht <break time="0.4s" /> im Text, sonst kein SSML
    const text = ssmlToPlain(ssml.replace(/<break time="(\d+)ms"\/>/g, (_, ms) => ` [[break:${Number(ms) / 1000}]] `)).replace(/\[\[break:([\d.]+)\]\]/g, '<break time="$1s" />');
    const res = await http(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=${format === "opus" ? "opus_48000_64" : "mp3_44100_128"}`,
      { method: "POST", headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY!, "Content-Type": "application/json", Accept: "audio/mpeg" }, body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", language_code: "de" }) },
      "ElevenLabs",
    );
    const audio = Buffer.from(await res.arrayBuffer());
    return { audio, durationMs: format === "mp3" ? mp3DurationMs(audio) : 0 };
  },
};

/* ── Testmodus: kurzer Ton statt echter Stimme ── */
const fake: TtsProvider = {
  id: "fake",
  label: "Testmodus (Ton)",
  defaultVoices: { female: "test-female", male: "test-male" },
  configured: () => true,
  async synthesize() {
    const audio = await readFile(path.join(process.cwd(), "public", "audio", "fake-tone.mp3"));
    return { audio, durationMs: mp3DurationMs(audio) };
  },
};

const PROVIDERS = { azure, google, elevenlabs, fake } as const;

export function ttsProvider(): TtsProvider {
  const id = (process.env.TTS_PROVIDER ?? "azure").toLowerCase() as keyof typeof PROVIDERS;
  return PROVIDERS[id] ?? azure;
}

/** Opus zusätzlich erzeugen (doppelte Kosten) – nur mit TTS_OPUS=1. */
export function opusEnabled(): boolean {
  return process.env.TTS_OPUS === "1";
}
