import { useCallback, useEffect, useRef, useState } from "react";

export function useMetronome(initialBpm = 90) {
  const [bpm, setBpm] = useState(initialBpm);
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const nextTimeRef = useRef(0);
  const beatRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;

  const stop = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    ctxRef.current?.close();
    ctxRef.current = null;
    setRunning(false);
    setBeat(0);
    beatRef.current = 0;
  }, []);

  const start = useCallback(() => {
    if (running) return;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    const ctx: AudioContext = new AC();
    ctxRef.current = ctx;
    nextTimeRef.current = ctx.currentTime + 0.1;
    setRunning(true);

    const schedule = () => {
      const c = ctxRef.current;
      if (!c) return;
      while (nextTimeRef.current < c.currentTime + 0.1) {
        const t = nextTimeRef.current;
        const osc = c.createOscillator();
        const gain = c.createGain();
        const isDown = beatRef.current % 4 === 0;
        osc.frequency.value = isDown ? 1400 : 900;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.4, t + 0.001);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
        osc.connect(gain).connect(c.destination);
        osc.start(t);
        osc.stop(t + 0.06);
        const b = beatRef.current;
        setTimeout(() => setBeat(b % 4), Math.max(0, (t - c.currentTime) * 1000));
        beatRef.current = (beatRef.current + 1) % 4;
        nextTimeRef.current += 60 / bpmRef.current;
      }
    };
    timerRef.current = window.setInterval(schedule, 25);
  }, [running]);

  useEffect(() => () => stop(), [stop]);

  return { bpm, setBpm, running, beat, start, stop };
}
