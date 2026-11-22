"use client";

import { normalizeForSpeech } from "@/lib/tts/prepare";
import { AUDIO_CACHE } from "./offline";
import type { AudioSrc } from "./types";

/**
 * Gemeinsame Wiedergabe-Engine (Singleton) für Mündlich-Auto-Modus, Lernbuch, Quiz und Karteikarten.
 * - EIN dauerhaftes <audio>-Element + Web-Audio-Graph (Pegel für die Wellenform) → Auto-Weiter auf iOS ohne neue Taps
 * - Opus wenn unterstützt, sonst MP3; Vorladen als Blob (Start < 150 ms)
 * - Stille-Schleife hält die Audio-Sitzung im Hintergrund am Leben
 * - Fallback: Gerätestimme (speechSynthesis, bevorzugt de-AT)
 */
type PlayResult = "ended" | "stopped" | "error";
type Listener = (e: { type: "interrupted" | "state"; playing: boolean }) => void;

const SILENCE_URL = "/audio/silence.mp3";

class AudioEngine {
  private el: HTMLAudioElement | null = null;
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gain: GainNode | null = null;
  private wired = false;
  private blobs = new Map<string, string>();
  private order: string[] = [];
  private current: { resolve: (r: PlayResult) => void } | null = null;
  private stopping = false;
  /** true während eines eigenen Quellwechsels (src) – „pause“ dann ignorieren */
  private switching = false;
  private listeners = new Set<Listener>();
  private speaking: SpeechSynthesisUtterance | null = null;
  rate = 1;
  /** true nach dem ersten Tap (iOS-Audio entsperrt) */
  unlocked = false;
  private opusOk: boolean | null = null;

  private element(): HTMLAudioElement {
    if (!this.el) {
      const el = new Audio();
      el.preload = "auto";
      el.crossOrigin = "anonymous";
      (el as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
      el.addEventListener("pause", () => {
        // Unterbrechung von außen (Anruf, Kopfhörer abgesteckt, andere App) – nicht bei eigenem Quellwechsel oder Ende
        if (this.stopping || this.switching || el.ended || !this.current) return;
        this.emit({ type: "interrupted", playing: false });
      });
      el.addEventListener("playing", () => {
        this.switching = false;
      });
      this.el = el;
    }
    return this.el;
  }

  /** Im ersten Tap aufrufen (entsperrt Audio auf iOS, startet AudioContext). */
  async unlock(): Promise<void> {
    this.unlocked = true;
    const el = this.element();
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx && !this.ctx) this.ctx = new Ctx();
      if (this.ctx && !this.wired) {
        const src = this.ctx.createMediaElementSource(el);
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;
        this.gain = this.ctx.createGain();
        src.connect(this.gain).connect(this.analyser).connect(this.ctx.destination);
        this.wired = true;
      }
      await this.ctx?.resume();
    } catch {
      /* Web Audio optional */
    }
    try {
      el.src = SILENCE_URL;
      el.muted = true;
      await el.play();
      el.pause();
    } catch {
      /* ignorieren */
    } finally {
      el.muted = false;
    }
  }

  on(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit(e: Parameters<Listener>[0]) {
    this.listeners.forEach((l) => l(e));
  }

  canOpus(): boolean {
    if (this.opusOk === null) this.opusOk = typeof window !== "undefined" && this.element().canPlayType('audio/ogg; codecs="opus"') !== "";
    return this.opusOk;
  }

  /** Beste URL einer Quelle (Opus wenn möglich). */
  pick(src: AudioSrc): string {
    return src.opus && this.canOpus() ? src.opus : src.mp3;
  }

  /** Dateien vorladen (Blob-URLs, max. 8 im Speicher). Nutzt den Offline-Cache, falls vorhanden. */
  async preload(srcs: (AudioSrc | undefined | null)[]): Promise<void> {
    for (const s of srcs) {
      if (!s) continue;
      const url = this.pick(s);
      if (this.blobs.has(url)) continue;
      try {
        let res: Response | undefined;
        if ("caches" in window) res = (await (await caches.open(AUDIO_CACHE)).match(url)) ?? undefined;
        res ??= await fetch(url, { mode: "cors" });
        if (!res.ok) continue;
        const blob = await res.blob();
        this.blobs.set(url, URL.createObjectURL(blob));
        this.order.push(url);
        while (this.order.length > 8) {
          const old = this.order.shift()!;
          URL.revokeObjectURL(this.blobs.get(old)!);
          this.blobs.delete(old);
        }
      } catch {
        /* ohne Vorladen weiter */
      }
    }
  }

  /** Auf aktuelle Wiedergabe-Datei auch im Offline-Cache ablegen (aktuelles Kapitel automatisch cachen). */
  async cacheForOffline(src: AudioSrc): Promise<void> {
    try {
      if (!("caches" in window)) return;
      const url = this.pick(src);
      const c = await caches.open(AUDIO_CACHE);
      if (!(await c.match(url))) await c.add(new Request(url, { mode: "cors" }));
    } catch {
      /* ignorieren */
    }
  }

  /** Datei abspielen; löst bei Ende/Stopp/Fehler auf. */
  play(src: AudioSrc, opts: { rate?: number } = {}): Promise<PlayResult> {
    this.cancelSpeech();
    const el = this.element();
    this.finish("stopped");
    const url = this.pick(src);
    return new Promise<PlayResult>((resolve) => {
      this.current = { resolve };
      el.loop = false;
      this.switching = true;
      el.src = this.blobs.get(url) ?? url;
      el.playbackRate = opts.rate ?? this.rate;
      (el as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
      el.onended = () => this.finish("ended");
      el.onerror = () => this.finish("error");
      void this.ctx?.resume();
      el.play()
        .then(() => this.emit({ type: "state", playing: true }))
        .catch(() => this.finish("error"));
    });
  }

  /**
   * Stille für ms abspielen (hält iOS-Hintergrundwiedergabe am Leben).
   * onTick bekommt die verbleibende Zeit – Zeitbasis sind Zeitstempel, nicht setInterval.
   */
  silence(ms: number, onTick?: (remainingMs: number) => void, isPaused?: () => boolean): Promise<PlayResult> {
    const el = this.element();
    this.finish("stopped");
    return new Promise<PlayResult>((resolve) => {
      this.current = { resolve };
      this.switching = true;
      el.src = SILENCE_URL;
      el.loop = true;
      el.onended = null;
      el.onerror = null;
      void el.play().catch(() => undefined);
      let remaining = ms;
      let last = performance.now();
      const step = () => {
        if (this.current?.resolve !== resolve) return;
        const now = performance.now();
        if (!isPaused?.()) remaining -= now - last;
        last = now;
        onTick?.(Math.max(0, remaining));
        if (remaining <= 0) {
          el.loop = false;
          this.finish("ended");
          return;
        }
        // rAF im Vordergrund, timeupdate/Timeout im Hintergrund
        if (document.visibilityState === "visible") requestAnimationFrame(step);
        else setTimeout(step, 250);
      };
      step();
    });
  }

  /** Ersatzstimme (Gerät) – wenn keine Datei vorhanden ist. */
  speak(text: string, opts: { rate?: number } = {}): Promise<PlayResult> {
    this.finish("stopped");
    this.cancelSpeech();
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return Promise.resolve("error");
    return new Promise<PlayResult>((resolve) => {
      this.current = { resolve };
      const u = new SpeechSynthesisUtterance(normalizeForSpeech(text));
      u.lang = "de-AT";
      const voices = window.speechSynthesis.getVoices();
      const v = voices.find((x) => x.lang.toLowerCase() === "de-at") ?? voices.find((x) => x.lang.toLowerCase() === "de-de") ?? voices.find((x) => x.lang.toLowerCase().startsWith("de"));
      if (v) u.voice = v;
      u.rate = (opts.rate ?? this.rate) * 0.95;
      u.onend = () => this.finish("ended");
      u.onerror = () => this.finish("error");
      this.speaking = u;
      window.speechSynthesis.speak(u);
      // Sicherheitsnetz: manche Browser melden das Ende nie (oder haben keine deutsche Stimme)
      const maxMs = 3000 + u.text.length * 90;
      const started = performance.now();
      const guard = () => {
        if (this.current?.resolve !== resolve) return;
        if (window.speechSynthesis.paused) return void setTimeout(guard, 500);
        if (performance.now() - started > maxMs || (!window.speechSynthesis.speaking && !window.speechSynthesis.pending && performance.now() - started > 1500)) {
          this.cancelSpeech();
          this.finish("ended");
          return;
        }
        setTimeout(guard, 500);
      };
      setTimeout(guard, 500);
    });
  }

  /** Datei oder – falls nicht vorhanden – Ersatzstimme. */
  playOrSpeak(src: AudioSrc | undefined | null, text: string, opts: { rate?: number } = {}): Promise<PlayResult> {
    return src ? this.play(src, opts).then((r) => (r === "error" ? this.speak(text, opts) : r)) : this.speak(text, opts);
  }

  pause() {
    this.stopping = true;
    this.el?.pause();
    if ("speechSynthesis" in window) window.speechSynthesis.pause();
    this.stopping = false;
    this.emit({ type: "state", playing: false });
  }
  resume() {
    void this.ctx?.resume();
    if (this.el?.src) void this.el.play().catch(() => undefined);
    if ("speechSynthesis" in window) window.speechSynthesis.resume();
    this.emit({ type: "state", playing: true });
  }
  stop() {
    this.stopping = true;
    this.cancelSpeech();
    this.el?.pause();
    this.finish("stopped");
    this.stopping = false;
  }
  setRate(r: number) {
    this.rate = r;
    if (this.el) this.el.playbackRate = r;
  }
  get paused() {
    return this.el ? this.el.paused : true;
  }

  /** Pegel 0–1 für die Wellenform (aus dem echten Signal). */
  levels(bins = 24): number[] {
    if (!this.analyser) return [];
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    const step = Math.floor(data.length / bins) || 1;
    return Array.from({ length: bins }, (_, i) => data[i * step] / 255);
  }

  /** Kurzer Ton (Countdown-Ticken / Gong) über Web Audio – ohne die Wiedergabe zu unterbrechen. */
  beep(kind: "tick" | "chime") {
    const ctx = this.ctx;
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = kind === "tick" ? 1100 : 880;
    o.type = "sine";
    const t = ctx.currentTime;
    const dur = kind === "tick" ? 0.06 : 0.5;
    g.gain.setValueAtTime(kind === "tick" ? 0.08 : 0.18, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur);
    if (kind === "chime") {
      const o2 = ctx.createOscillator();
      o2.frequency.value = 1320;
      o2.connect(g);
      o2.start(t + 0.12);
      o2.stop(t + dur);
    }
  }

  /** Sperrbildschirm / Kopfhörer / Auto: Metadaten und Tasten. */
  mediaSession(meta: { title: string; artist: string; album?: string }, handlers: Partial<Record<"play" | "pause" | "nexttrack" | "previoustrack", () => void>>) {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({ ...meta, album: meta.album ?? "TaxiFit", artwork: [{ src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }] });
    for (const [k, fn] of Object.entries(handlers)) {
      try {
        navigator.mediaSession.setActionHandler(k as MediaSessionAction, fn ?? null);
      } catch {
        /* nicht unterstützt */
      }
    }
  }

  private cancelSpeech() {
    if (this.speaking && "speechSynthesis" in window) window.speechSynthesis.cancel();
    this.speaking = null;
  }
  private finish(r: PlayResult) {
    const c = this.current;
    this.current = null;
    if (this.el) {
      this.el.onended = null;
      this.el.onerror = null;
    }
    c?.resolve(r);
    if (r !== "stopped") this.emit({ type: "state", playing: false });
  }
}

let engine: AudioEngine | null = null;
export function audioEngine(): AudioEngine {
  engine ??= new AudioEngine();
  return engine;
}
export type { AudioEngine };
