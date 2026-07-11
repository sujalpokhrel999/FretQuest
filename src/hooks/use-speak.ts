import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Small wrapper around the browser SpeechSynthesis API.
 * Used to announce practice prompts (e.g. "Play C on the 4th string").
 */
export function useSpeak(defaultEnabled = false) {
  const [enabled, setEnabled] = useState(defaultEnabled);
  const [supported, setSupported] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      // Prefer an English voice; fall back to first available.
      voiceRef.current =
        voices.find((v) => /en(-|_)?US/i.test(v.lang) && /female|samantha|zira/i.test(v.name)) ||
        voices.find((v) => v.lang?.toLowerCase().startsWith("en")) ||
        voices[0] ||
        null;
    };
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!enabled || !supported || typeof window === "undefined") return;
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        if (voiceRef.current) u.voice = voiceRef.current;
        u.rate = 0.95;
        u.pitch = 1;
        u.volume = 1;
        window.speechSynthesis.speak(u);
      } catch {
        /* noop */
      }
    },
    [enabled, supported],
  );

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return { enabled, setEnabled, supported, speak, stop };
}

/** Convert a note name like "C#" into spoken form like "C sharp". */
export function speakableNote(note: string): string {
  return note.replace("#", " sharp").replace("b", " flat");
}

/** stringIdx: 0 = low E (6th), 5 = high E (1st) */
export function stringOrdinalLabel(stringIdx: number): string {
  const ord = 6 - stringIdx;
  const suffix = ord === 1 ? "st" : ord === 2 ? "nd" : ord === 3 ? "rd" : "th";
  return `${ord}${suffix}`;
}
