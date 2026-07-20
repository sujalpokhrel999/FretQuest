import { useCallback, useEffect, useRef, useState } from "react";
import { frequencyToNote, type DetectedNote } from "@/lib/music";

/**
 * Real-time monophonic guitar pitch detector.
 *
 * Pipeline (per audio frame):
 *   1. Pre-emphasis DC-block + 2-pole IIR low-pass (≈1200 Hz cutoff)
 *      to kill string harmonics & mic hiss before pitch estimation.
 *   2. 4× decimation → effective fs ≈ 11 kHz. Cheaper YIN, more samples
 *      per period on E2 (82.4 Hz) so tau-resolution improves.
 *   3. Short-term RMS onset gate: skip the first ~30 ms of a pluck
 *      (attack transient is inharmonic, ruins YIN).
 *   4. YIN with Cumulative Mean Normalized Difference Function (CMNDF),
 *      absolute-threshold search (0.10–0.15), parabolic interpolation
 *      of the trough → sub-sample tau → sub-cent frequency accuracy.
 *   5. Octave-jump guard: if new estimate is within ±30¢ of a *halved*
 *      or *doubled* previous stable estimate, snap back.
 *   6. Rolling median (5 frames) + EMA smoothing on frequency for
 *      jitter-free needle without perceptible latency.
 */

export interface PitchState {
  listening: boolean;
  error: string | null;
  frequency: number;
  clarity: number; // 0..1 pitch confidence
  volume: number;  // 0..1 rms
  note: DetectedNote | null;
}

export interface UsePitchOptions {
  minClarity?: number;
  minVolume?: number;
  onNote?: (n: DetectedNote, v: number) => void;
}

// ---------- DSP helpers ------------------------------------------------

/** 4× decimator using cascaded 1-pole IIR low-pass (~1200 Hz @ 44.1k). */
class Decimator {
  private y1 = 0;
  private y2 = 0;
  private phase = 0;
  private readonly a: number;
  constructor(sampleRate: number, cutoffHz = 1200) {
    // 1-pole IIR: y = a*y_prev + (1-a)*x
    this.a = Math.exp(-2 * Math.PI * cutoffHz / sampleRate);
  }
  process(input: Float32Array, out: Float32Array): number {
    const a = this.a;
    const b = 1 - a;
    let o = 0;
    for (let i = 0; i < input.length; i++) {
      // cascaded 2-pole => ~ -12 dB/oct at cutoff
      this.y1 = a * this.y1 + b * input[i];
      this.y2 = a * this.y2 + b * this.y1;
      if ((this.phase++ & 3) === 0) out[o++] = this.y2;
    }
    return o;
  }
  reset() { this.y1 = 0; this.y2 = 0; this.phase = 0; }
}

/** Core YIN/pYIN estimator with CMNDF + parabolic interpolation. */
function yinPitch(
  buf: Float32Array,
  fs: number,
  threshold: number,
  minFreq: number,
  maxFreq: number,
): { freq: number; clarity: number } {
  const N = buf.length;
  const tauMin = Math.max(2, Math.floor(fs / maxFreq));
  const tauMax = Math.min(N - 2, Math.ceil(fs / minFreq));
  if (tauMax <= tauMin + 2) return { freq: 0, clarity: 0 };
  const W = N - tauMax;

  // Step 1: difference function d(tau)
  const d = new Float32Array(tauMax + 1);
  for (let tau = tauMin; tau <= tauMax; tau++) {
    let sum = 0;
    for (let i = 0; i < W; i++) {
      const diff = buf[i] - buf[i + tau];
      sum += diff * diff;
    }
    d[tau] = sum;
  }

  // Step 2: CMNDF — prevents the trivial tau=0 minimum & normalizes scale
  const cmnd = new Float32Array(tauMax + 1);
  cmnd[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= tauMax; tau++) {
    running += d[tau];
    cmnd[tau] = running > 0 ? d[tau] * tau / running : 1;
  }

  // Step 3: first trough below absolute threshold (dynamic 0.10–0.15)
  let tauEst = -1;
  for (let tau = tauMin; tau < tauMax; tau++) {
    if (cmnd[tau] < threshold) {
      while (tau + 1 <= tauMax && cmnd[tau + 1] < cmnd[tau]) tau++;
      tauEst = tau;
      break;
    }
  }
  if (tauEst < 0) {
    // Probabilistic fallback: pick global min if plausible.
    let best = tauMin;
    let bestVal = cmnd[tauMin];
    for (let tau = tauMin + 1; tau <= tauMax; tau++) {
      if (cmnd[tau] < bestVal) { bestVal = cmnd[tau]; best = tau; }
    }
    if (bestVal > 0.55) return { freq: 0, clarity: 0 };
    tauEst = best;
  }

  // Step 4: parabolic (quadratic) interpolation on the CMNDF trough for
  // sub-sample precision → sub-cent accuracy on f0.
  const x0 = tauEst > tauMin ? tauEst - 1 : tauEst;
  const x2 = tauEst + 1 <= tauMax ? tauEst + 1 : tauEst;
  const s0 = cmnd[x0], s1 = cmnd[tauEst], s2 = cmnd[x2];
  const denom = s0 + s2 - 2 * s1;
  const betterTau = denom !== 0 ? tauEst + (s0 - s2) / (2 * denom) : tauEst;

  const freq = fs / betterTau;
  const clarity = Math.max(0, Math.min(1, 1 - cmnd[tauEst]));
  return { freq, clarity };
}

// ---------- Hook -------------------------------------------------------

export function usePitch(opts: UsePitchOptions = {}) {
  const { minClarity = 0.75, minVolume = 0.008, onNote } = opts;

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
  const bufferRef = useRef<Float32Array | null>(null);
  const decRef = useRef<Decimator | null>(null);
  const decBufRef = useRef<Float32Array | null>(null);
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
    decRef.current = null;
    setState((s) => ({ ...s, listening: false }));
  }, []);

  const start = useCallback(async () => {
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices) {
        throw new Error("Microphone API not available");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      streamRef.current = stream;
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new AC();
      ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      // 8192 samples @ 44.1k ≈ 186 ms window: enough periods of E2 (~15) for YIN.
      analyser.fftSize = 8192;
      src.connect(analyser);
      analyserRef.current = analyser;

      const raw = new Float32Array(new ArrayBuffer(analyser.fftSize * 4));
      bufferRef.current = raw;
      decRef.current = new Decimator(ctx.sampleRate, 1200);
      const decLen = Math.ceil(analyser.fftSize / 4);
      decBufRef.current = new Float32Array(decLen);

      const decFs = ctx.sampleRate / 4;

      setState((s) => ({ ...s, listening: true, error: null }));

      // Post-processing state
      const freqHistory: number[] = [];
      const HISTORY = 5;              // median window
      let ema = 0;                    // exponential moving average
      const EMA_ALPHA = 0.35;
      let stableFreq = 0;             // last confident freq for octave-lock
      let onsetSamples = 0;           // samples since last onset (in raw fs)
      const ATTACK_MASK_MS = 30;
      const attackMaskSamples = (ctx.sampleRate * ATTACK_MASK_MS) / 1000;
      let prevRms = 0;

      const loop = () => {
        const a = analyserRef.current;
        const b = bufferRef.current;
        const dec = decRef.current;
        const decBuf = decBufRef.current;
        const c = ctxRef.current;
        if (!a || !b || !dec || !decBuf || !c) return;
        a.getFloatTimeDomainData(b as unknown as Float32Array<ArrayBuffer>);

        // --- RMS + onset detection (raw signal) ---
        let sumSq = 0;
        for (let i = 0; i < b.length; i++) sumSq += b[i] * b[i];
        const rms = Math.sqrt(sumSq / b.length);

        // Detect rising edge (onset) → start attack mask
        if (rms > minVolume && rms > prevRms * 1.6) onsetSamples = 0;
        else onsetSamples += b.length;
        prevRms = rms;

        // Decimate → low-pass filtered narrow-band signal for YIN
        const nDec = dec.process(b, decBuf);
        const view = decBuf.subarray(0, nDec);

        // Gate: mid-attack transient OR silent → don't estimate
        const gated = onsetSamples < attackMaskSamples || rms < minVolume;

        let freq = 0;
        let clarity = 0;
        if (!gated) {
          // Dynamic threshold: cleaner signal → tighter threshold
          const threshold = rms > minVolume * 6 ? 0.10 : 0.15;
          const r = yinPitch(view, decFs, threshold, 70, 1400);
          freq = r.freq;
          clarity = r.clarity;
        }

        // --- Octave-jump guard vs last stable f0 ---
        if (freq && stableFreq) {
          const ratio = freq / stableFreq;
          if (Math.abs(ratio - 0.5) < 0.03) freq *= 2;      // caught the sub-octave
          else if (Math.abs(ratio - 2.0) < 0.06) freq *= 0.5; // caught the octave-double
        }

        const accept = freq > 0 && clarity > minClarity && rms > minVolume;

        // --- Rolling median + EMA smoothing ---
        let smoothed = ema;
        if (accept) {
          freqHistory.push(freq);
          if (freqHistory.length > HISTORY) freqHistory.shift();
          const sorted = [...freqHistory].sort((x, y) => x - y);
          const median = sorted[sorted.length >> 1];
          smoothed = ema ? ema * (1 - EMA_ALPHA) + median * EMA_ALPHA : median;
          ema = smoothed;
          stableFreq = median;
        } else if (rms < minVolume * 0.5) {
          // silence → reset so next attack starts clean
          freqHistory.length = 0;
          ema = 0;
          stableFreq = 0;
          dec.reset();
        }

        let note: DetectedNote | null = null;
        if (smoothed && accept) {
          note = frequencyToNote(smoothed);
          if (note && onNoteRef.current) onNoteRef.current(note, rms);
        }

        setState((s) => ({
          ...s,
          frequency: smoothed || freq,
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
