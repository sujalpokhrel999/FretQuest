import { useCallback, useEffect, useRef, useState } from "react";
import type { JamChord } from "@/lib/jam";
import { noteToFrequency } from "@/lib/music";

/**
 * Very small Web Audio backing track: cycles through a chord progression,
 * playing each chord for `beatsPerChord` beats at `bpm`. Each chord is
 * a triad synthesized with soft triangle-wave oscillators plus an
 * envelope, and a subtle bass pluck on the root.
 */
export function useBackingTrack(opts: {
  progression: JamChord[];
  bpm?: number;
  beatsPerChord?: number;
}) {
  const { progression, bpm = 90, beatsPerChord = 4 } = opts;
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(0);
  const [chordIdx, setChordIdx] = useState(0);

  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const scheduledUntilRef = useRef(0);
  const progRef = useRef(progression);
  progRef.current = progression;

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

  const playNoteAt = (
    ctx: AudioContext,
    dest: AudioNode,
    midi: number,
    when: number,
    dur: number,
    gain = 0.09,
    type: OscillatorType = "triangle",
  ) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = noteToFrequency(midi);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(gain, when + 0.01);
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
    master.gain.value = 0.6;
    master.connect(ctx.destination);
    masterRef.current = master;

    const beatDur = 60 / bpm;
    const chordDur = beatDur * beatsPerChord;
    startTimeRef.current = ctx.currentTime + 0.05;
    scheduledUntilRef.current = 0;
    setPlaying(true);

    // scheduler loop — schedules ~1.5s ahead
    const tick = () => {
      const c = ctxRef.current;
      const m = masterRef.current;
      if (!c || !m) return;
      const now = c.currentTime;
      const ahead = now + 1.5;
      let cursor = startTimeRef.current + scheduledUntilRef.current;
      const prog = progRef.current;
      while (cursor < ahead) {
        const overallBeat = Math.round((cursor - startTimeRef.current) / beatDur);
        const chordI = Math.floor(overallBeat / beatsPerChord) % prog.length;
        const chord = prog[chordI];
        // chord tones: root, third, fifth
        const third = chord.quality === "minor" ? 3 : 4;
        const midis = [chord.rootMidi + 12, chord.rootMidi + 12 + third, chord.rootMidi + 12 + 7];
        // pluck chord at chord boundary
        if (overallBeat % beatsPerChord === 0) {
          midis.forEach((m2, i) =>
            playNoteAt(c, m, m2, cursor + i * 0.008, chordDur * 0.95, 0.06, "triangle"),
          );
          // bass root
          playNoteAt(c, m, chord.rootMidi, cursor, chordDur * 0.95, 0.1, "sine");
        }
        // metronome tick
        playNoteAt(
          c,
          m,
          overallBeat % beatsPerChord === 0 ? 84 : 76,
          cursor,
          0.05,
          overallBeat % beatsPerChord === 0 ? 0.05 : 0.025,
          "square",
        );
        cursor += beatDur;
      }
      scheduledUntilRef.current = cursor - startTimeRef.current;

      // UI updates for current beat / chord
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
