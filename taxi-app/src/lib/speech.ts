/** Vorlesen per Web Speech API – bevorzugt österreichisches Deutsch (de-AT). */
export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

export function audioModeEnabled(): boolean {
  try {
    return localStorage.getItem("tp-audio") === "on";
  } catch {
    return false;
  }
}

export function setAudioMode(on: boolean) {
  try {
    localStorage.setItem("tp-audio", on ? "on" : "off");
  } catch {
    /* ignorieren */
  }
}

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.toLowerCase() === "de-at") ??
    voices.find((v) => v.lang.toLowerCase() === "de-de") ??
    voices.find((v) => v.lang.toLowerCase().startsWith("de"))
  );
}

export function speak(text: string, onEnd?: () => void) {
  if (!speechSupported()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "de-AT";
  const voice = pickVoice();
  if (voice) u.voice = voice;
  u.rate = 0.95;
  if (onEnd) {
    u.onend = onEnd;
    u.onerror = onEnd;
  }
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel();
}
