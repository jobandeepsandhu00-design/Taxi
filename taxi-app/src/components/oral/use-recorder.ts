"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecorderState = "idle" | "requesting" | "recording" | "denied" | "unsupported";

const BARS = 28;

function pickMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported?.(m)) return m;
  }
  return undefined;
}

export function recorderSupported(): boolean {
  return typeof window !== "undefined" && typeof MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
}

type SpeechRec = { lang: string; interimResults: boolean; continuous: boolean; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onerror: (() => void) | null; start: () => void; stop: () => void };

function createLiveRecognition(): SpeechRec | null {
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  try {
    const r = new Ctor();
    r.lang = "de-AT";
    r.interimResults = true;
    r.continuous = true;
    return r;
  } catch {
    return null;
  }
}

/**
 * Aufnahme per MediaRecorder mit Pegelanzeige (AnalyserNode), Laufzeit, Auto-Stopp
 * und optionaler Live-Vorschau (Web Speech API – nur Anzeige, nie zur Bewertung).
 */
export function useRecorder({ maxSeconds, onDone }: { maxSeconds: number; onDone: (blob: Blob, durationMs: number) => void }) {
  const [state, setState] = useState<RecorderState>(() => (typeof window !== "undefined" && !recorderSupported() ? "unsupported" : "idle"));
  const [levels, setLevels] = useState<number[]>(() => Array(BARS).fill(0));
  const [elapsed, setElapsed] = useState(0);
  const [liveText, setLiveText] = useState("");
  const refs = useRef<{ stream?: MediaStream; rec?: MediaRecorder; ctx?: AudioContext; raf?: number; started?: number; chunks: Blob[]; cancelled?: boolean; live?: SpeechRec | null }>({ chunks: [] });
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const cleanup = useCallback(() => {
    const r = refs.current;
    if (r.raf) cancelAnimationFrame(r.raf);
    r.stream?.getTracks().forEach((t) => t.stop());
    void r.ctx?.close().catch(() => undefined);
    try {
      r.live?.stop();
    } catch {
      /* egal */
    }
    refs.current = { chunks: [] };
    setLevels(Array(BARS).fill(0));
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const stop = useCallback(() => {
    const rec = refs.current.rec;
    if (rec && rec.state !== "inactive") rec.stop();
  }, []);

  const cancel = useCallback(() => {
    refs.current.cancelled = true;
    stop();
    cleanup();
    setState("idle");
  }, [stop, cleanup]);

  const start = useCallback(async (opts?: { live?: boolean }) => {
    if (!recorderSupported()) {
      setState("unsupported");
      return false;
    }
    setState("requesting");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
    } catch {
      setState("denied");
      return false;
    }
    const mime = pickMime();
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 48_000 } : undefined);
    const r = (refs.current = { stream, rec, chunks: [] as Blob[], started: performance.now() } as typeof refs.current);
    rec.ondataavailable = (e) => e.data.size > 0 && r.chunks.push(e.data);
    rec.onstop = () => {
      const duration = Math.round(performance.now() - (r.started ?? performance.now()));
      const blob = new Blob(r.chunks, { type: rec.mimeType || mime || "audio/webm" });
      const cancelled = r.cancelled;
      cleanup();
      setState("idle");
      if (!cancelled && blob.size > 0) doneRef.current(blob, duration);
    };

    // Pegel für die Wellenform
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      r.ctx = ctx;
      const data = new Uint8Array(analyser.frequencyBinCount);
      let last = 0;
      const tick = (t: number) => {
        r.raf = requestAnimationFrame(tick);
        const ms = performance.now() - (r.started ?? 0);
        if (t - last < 50) return;
        last = t;
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += Math.abs(data[i] - 128);
        const level = Math.min(1, (sum / data.length / 128) * 4.5);
        setLevels((prev) => [...prev.slice(1), level]);
        setElapsed(ms);
        if (ms >= maxSeconds * 1000) stop();
      };
      r.raf = requestAnimationFrame(tick);
    } catch {
      const iv = window.setInterval(() => {
        const ms = performance.now() - (r.started ?? 0);
        setElapsed(ms);
        if (ms >= maxSeconds * 1000 || rec.state === "inactive") {
          window.clearInterval(iv);
          stop();
        }
      }, 200);
    }

    if (opts?.live) {
      const live = createLiveRecognition();
      if (live) {
        live.onresult = (e) => {
          let text = "";
          for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
          setLiveText(text);
        };
        live.onerror = () => undefined;
        try {
          live.start();
          r.live = live;
        } catch {
          /* Vorschau ist optional */
        }
      }
    }

    setLiveText("");
    setElapsed(0);
    rec.start(250);
    setState("recording");
    return true;
  }, [cleanup, maxSeconds, stop]);

  return { state, levels, elapsed, liveText, start, stop, cancel };
}
