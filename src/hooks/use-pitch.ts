import { useCallback, useEffect, useRef, useState } from "react";
import { PitchDetector } from "pitchy";
import { frequencyToNote, type DetectedNote } from "@/lib/music";

export interface PitchState {
  listening: boolean;
  error: string | null;
  frequency: number;
  clarity: number;
  volume: number; // 0..1 rms
  note: DetectedNote | null;
}

export interface UsePitchOptions {
  minClarity?: number;
  minVolume?: number;
  onNote?: (n: DetectedNote, v: number) => void;
}

export function usePitch(opts: UsePitchOptions = {}) {
  const { minClarity = 0.82, minVolume = 0.008, onNote } = opts;

  const [state, setState] = useState<PitchState>({
    listening: false,
    error: null,
    frequency: 0,
    clarity: 0,
    volume: 0,
    note: null,
  });

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const detectorRef = useRef<PitchDetector<Float32Array> | null>(null);
  const bufferRef = useRef<Float32Array | null>(null);
  const onNoteRef = useRef(onNote);
  onNoteRef.current = onNote;

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close();
    ctxRef.current = null;
    analyserRef.current = null;
    detectorRef.current = null;
    setState((s) => ({ ...s, listening: false }));
  }, []);

  const start = useCallback(async () => {
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices) {
        throw new Error("Microphone API not available");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new AC();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      // Larger FFT gives more samples per frame -> more accurate on low strings (E2 ~82Hz)
      analyser.fftSize = 4096;
      source.connect(analyser);
      analyserRef.current = analyser;
      const detector = PitchDetector.forFloat32Array(analyser.fftSize);
      // Trade a bit of accuracy for far greater tolerance to noisy / soft input
      // (default 0.7). GuitarTuna-style: accept lower-quality frames and smooth.
      (detector as any).clarityThreshold = 0.5;
      detectorRef.current = detector;
      const buffer = new Float32Array(new ArrayBuffer(analyser.fftSize * 4));
      bufferRef.current = buffer;

      setState((s) => ({ ...s, listening: true, error: null }));

      // Rolling window of recent frequencies for median smoothing (kills jitter/octave jumps)
      const freqHistory: number[] = [];
      const HISTORY_SIZE = 6;
      let lastSmoothed = 0;

      const loop = () => {
        const a = analyserRef.current;
        const d = detectorRef.current;
        const b = bufferRef.current;
        const c = ctxRef.current;
        if (!a || !d || !b || !c) return;
        a.getFloatTimeDomainData(b as unknown as Float32Array<ArrayBuffer>);
        // rms
        let sumSq = 0;
        for (let i = 0; i < b.length; i++) sumSq += b[i] * b[i];
        const rms = Math.sqrt(sumSq / b.length);
        const [rawFreq, clarity] = d.findPitch(b as unknown as Float32Array<ArrayBuffer>, c.sampleRate);

        // Accept a frame if EITHER clarity is decent OR the signal is loud and roughly in guitar range.
        const inRange = rawFreq > 60 && rawFreq < 1400;
        const acceptable =
          inRange && (clarity > minClarity || (clarity > 0.6 && rms > minVolume * 3));

        let smoothed = lastSmoothed;
        if (acceptable && rms > minVolume) {
          freqHistory.push(rawFreq);
          if (freqHistory.length > HISTORY_SIZE) freqHistory.shift();
          // median = robust vs octave errors / brief spikes
          const sorted = [...freqHistory].sort((x, y) => x - y);
          const median = sorted[Math.floor(sorted.length / 2)];
          // Exponential smoothing on top for a silky needle
          smoothed = lastSmoothed
            ? lastSmoothed * 0.6 + median * 0.4
            : median;
          lastSmoothed = smoothed;
        } else if (rms < minVolume * 0.5) {
          // string decayed / silence -> reset smoothing so next note isn't blended
          freqHistory.length = 0;
          lastSmoothed = 0;
        }

        let note: DetectedNote | null = null;
        if (smoothed && acceptable) {
          note = frequencyToNote(smoothed);
          if (note && onNoteRef.current) onNoteRef.current(note, rms);
        }
        setState((s) => ({
          ...s,
          frequency: smoothed || rawFreq,
          clarity,
          volume: rms,
          note: note ?? s.note,
        }));
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch (e: any) {
      setState((s) => ({ ...s, error: e?.message ?? "Microphone access denied", listening: false }));
    }
  }, [minClarity, minVolume]);

  useEffect(() => () => stop(), [stop]);

  return { ...state, start, stop };
}
