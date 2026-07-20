import { useCallback, useEffect, useRef, useState } from "react";
import type { JamChord } from "@/lib/jam";
import { noteToFrequency } from "@/lib/music";

export type JamStyle = "strum" | "arpeggio" | "rock" | "funk" | "ballad";

export const JAM_STYLES: { id: JamStyle; label: string; hint: string }[] = [
  { id: "strum",    label: "Acoustic Strum", hint: "Full triads, steady groove" },
  { id: "arpeggio", label: "Clean Arpeggio", hint: "One note per beat, airy" },
  { id: "rock",     label: "Rock Power",     hint: "Root+fifth, punchy on 1 & 3" },
  { id: "funk",     label: "Funk Staccato",  hint: "Choppy 8ths, tight & bright" },
  { id: "ballad",   label: "Ballad Pad",     hint: "Long soft pad + bass" },
];

/**
 * Web-Audio backing track with multiple stylistic patterns so users can
 * jam over more than one groove. Each style defines its own per-beat
 * scheduling of chord tones + bass + metronome.
 */
export function useBackingTrack(opts: {
  progression: JamChord[];
  bpm?: number;
  beatsPerChord?: number;
  style?: JamStyle;
}) {
  const { progression, bpm = 90, beatsPerChord = 4, style = "strum" } = opts;
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(0);
  const [chordIdx, setChordIdx] = useState(0);

  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const scheduledUntilRef = useRef(0);
  const progRef = useRef(progression);
  const styleRef = useRef(style);
  progRef.current = progression;
  styleRef.current = style;

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    masterRef.current?.gain.cancelScheduledValues(ctxRef.current?.currentTime ?? 0);
    ctxRef.current?.close();
    ctxRef.current = null;
    masterRef.current = null;
    setPlaying(false);
    setBeat(0);
    setChordIdx(0);
  }, []);

  const voice = (
    ctx: AudioContext,
    dest: AudioNode,
    midi: number,
    when: number,
    dur: number,
    gain: number,
    type: OscillatorType,
  ) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = noteToFrequency(midi);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(gain, when + Math.min(0.02, dur * 0.1));
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g).connect(dest);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  };

  const start = useCallback(() => {
    if (playing) return;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    const ctx: AudioContext = new AC();
    ctxRef.current = ctx;
    const master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    masterRef.current = master;

    const beatDur = 60 / bpm;
    startTimeRef.current = ctx.currentTime + 0.05;
    scheduledUntilRef.current = 0;
    setPlaying(true);

    const scheduleBeat = (overallBeat: number, when: number) => {
      const c = ctxRef.current!;
      const m = masterRef.current!;
      const prog = progRef.current;
      const st = styleRef.current;
      const chordI = Math.floor(overallBeat / beatsPerChord) % prog.length;
      const beatInChord = overallBeat % beatsPerChord;
      const chord = prog[chordI];
      const third = chord.quality === "minor" ? 3 : 4;
      const rootMidi = chord.rootMidi;
      const chordDur = beatDur * beatsPerChord;
      const triad = [rootMidi + 12, rootMidi + 12 + third, rootMidi + 12 + 7];

      // metronome tick (always, subtle)
      voice(c, m, beatInChord === 0 ? 84 : 76, when, 0.05,
            beatInChord === 0 ? 0.05 : 0.022, "square");

      switch (st) {
        case "strum": {
          if (beatInChord === 0) {
            triad.forEach((n, i) => voice(c, m, n, when + i * 0.008, chordDur * 0.95, 0.06, "triangle"));
            voice(c, m, rootMidi, when, chordDur * 0.95, 0.1, "sine");
          } else if (beatInChord === 2) {
            // upstroke accent
            triad.forEach((n, i) => voice(c, m, n, when + i * 0.006, beatDur * 1.8, 0.035, "triangle"));
          }
          break;
        }
        case "arpeggio": {
          const pattern = [rootMidi + 12, rootMidi + 12 + 7, rootMidi + 12 + third, rootMidi + 24];
          const note = pattern[beatInChord % pattern.length];
          voice(c, m, note, when, beatDur * 1.1, 0.08, "triangle");
          if (beatInChord === 0) voice(c, m, rootMidi, when, chordDur * 0.95, 0.09, "sine");
          break;
        }
        case "rock": {
          // Power chord (root + 5th) on beats 1 and 3, saw for grit
          if (beatInChord === 0 || beatInChord === 2) {
            voice(c, m, rootMidi, when, beatDur * 1.9, 0.11, "sawtooth");
            voice(c, m, rootMidi + 7, when, beatDur * 1.9, 0.09, "sawtooth");
            voice(c, m, rootMidi - 12, when, beatDur * 1.9, 0.09, "square");
          }
          break;
        }
        case "funk": {
          // eighth-note staccato chord stabs (skip a few for groove)
          const stabs = [true, false, true, true, false, true, true, false];
          for (let e = 0; e < 2; e++) {
            const t = when + e * (beatDur / 2);
            const idx = (beatInChord * 2 + e) % stabs.length;
            if (!stabs[idx]) continue;
            triad.forEach((n) => voice(c, m, n, t, beatDur * 0.18, 0.05, "square"));
          }
          voice(c, m, rootMidi, when, beatDur * 0.9, 0.11, "sine");
          break;
        }
        case "ballad": {
          if (beatInChord === 0) {
            triad.forEach((n) => voice(c, m, n, when, chordDur * 0.98, 0.045, "sine"));
            voice(c, m, rootMidi, when, chordDur * 0.98, 0.09, "sine");
          }
          if (beatInChord === 2) {
            voice(c, m, rootMidi + 12 + 7, when, beatDur * 2, 0.04, "triangle");
          }
          break;
        }
      }
    };

    const tick = () => {
      const c = ctxRef.current;
      if (!c) return;
      const now = c.currentTime;
      const ahead = now + 1.5;
      let cursor = startTimeRef.current + scheduledUntilRef.current;
      while (cursor < ahead) {
        const overallBeat = Math.round((cursor - startTimeRef.current) / beatDur);
        scheduleBeat(overallBeat, cursor);
        cursor += beatDur;
      }
      scheduledUntilRef.current = cursor - startTimeRef.current;

      const elapsed = now - startTimeRef.current;
      const currentBeat = Math.max(0, Math.floor(elapsed / beatDur));
      setBeat(currentBeat % beatsPerChord);
      setChordIdx(Math.floor(currentBeat / beatsPerChord) % progRef.current.length);

      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, [bpm, beatsPerChord, playing]);

  useEffect(() => () => stop(), [stop]);

  return { playing, beat, chordIdx, start, stop };
}
