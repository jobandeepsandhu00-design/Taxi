/**
 * Kurze, dezente Effekte – direkt im Browser synthetisiert (Web Audio, 0 KB Download, je < 300 ms).
 * Ein/Aus über localStorage „tp-sound“ (Standard: an).
 */
type SoundName = "correct" | "wrong" | "levelUp" | "streak";

let ctx: AudioContext | null = null;

export function soundEnabled(): boolean {
  try {
    return localStorage.getItem("tp-sound") !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean) {
  try {
    localStorage.setItem("tp-sound", on ? "on" : "off");
  } catch {
    /* ignorieren */
  }
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(ac: AudioContext, { freq, to, start = 0, dur, type = "sine", gain = 0.16 }: { freq: number; to?: number; start?: number; dur: number; type?: OscillatorType; gain?: number }) {
  const t = ac.currentTime + start;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function whoosh(ac: AudioContext) {
  const dur = 0.28;
  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(400, ac.currentTime);
  filter.frequency.exponentialRampToValueAtTime(3200, ac.currentTime + dur);
  const g = ac.createGain();
  g.gain.value = 0.22;
  src.connect(filter).connect(g).connect(ac.destination);
  src.start();
}

export function playSound(name: SoundName) {
  if (!soundEnabled()) return;
  const ac = audio();
  if (!ac) return;
  try {
    switch (name) {
      case "correct": // helles „Ding“
        tone(ac, { freq: 1046, dur: 0.12, gain: 0.14 });
        tone(ac, { freq: 1568, start: 0.07, dur: 0.2, gain: 0.12 });
        break;
      case "wrong": // tiefer, weicher „Thud“
        tone(ac, { freq: 180, to: 70, dur: 0.22, type: "triangle", gain: 0.3 });
        break;
      case "levelUp": // Taxi-Hupe „tüt-tüt“
        tone(ac, { freq: 440, dur: 0.11, type: "square", gain: 0.07 });
        tone(ac, { freq: 554, dur: 0.11, type: "square", gain: 0.05 });
        tone(ac, { freq: 440, start: 0.16, dur: 0.12, type: "square", gain: 0.07 });
        tone(ac, { freq: 554, start: 0.16, dur: 0.12, type: "square", gain: 0.05 });
        break;
      case "streak":
        whoosh(ac);
        break;
    }
  } catch {
    /* Audio ist optional */
  }
}
