// Music theory + guitar helpers

export const NOTE_NAMES = [
  "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
] as const;

export type NoteName = (typeof NOTE_NAMES)[number];

export interface DetectedNote {
  note: NoteName;
  octave: number;
  frequency: number;
  cents: number; // deviation from perfect pitch (-50..+50)
  midi: number;
}

// Convert frequency (Hz) to a detected note
export function frequencyToNote(freq: number): DetectedNote | null {
  if (!freq || freq <= 0 || !isFinite(freq)) return null;
  const midiFloat = 69 + 12 * Math.log2(freq / 440);
  const midi = Math.round(midiFloat);
  const cents = Math.round((midiFloat - midi) * 100);
  const noteIndex = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return {
    note: NOTE_NAMES[noteIndex],
    octave,
    frequency: freq,
    cents,
    midi,
  };
}

export function noteToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Standard tuning E A D G B E (low -> high). MIDI numbers.
// String index 0 = low E (6th string), 5 = high E (1st string).
export const STANDARD_TUNING: { name: string; midi: number; label: string }[] = [
  { name: "E2", midi: 40, label: "Low E (6th)" },
  { name: "A2", midi: 45, label: "A (5th)" },
  { name: "D3", midi: 50, label: "D (4th)" },
  { name: "G3", midi: 55, label: "G (3rd)" },
  { name: "B3", midi: 59, label: "B (2nd)" },
  { name: "E4", midi: 64, label: "High E (1st)" },
];

export const FRET_COUNT = 12;

// midi at a given string/fret
export function fretMidi(stringIdx: number, fret: number): number {
  return STANDARD_TUNING[stringIdx].midi + fret;
}

export function midiToLabel(midi: number): string {
  const idx = ((midi % 12) + 12) % 12;
  const oct = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[idx]}${oct}`;
}

export function midiToNoteName(midi: number): NoteName {
  return NOTE_NAMES[((midi % 12) + 12) % 12];
}

// Pentatonic scales (semitone intervals from root)
export const PENT_MINOR = [0, 3, 5, 7, 10];
export const PENT_MAJOR = [0, 2, 4, 7, 9];

export interface ChordShape {
  name: string;
  // For each string (low E -> high E): -1 = muted, 0 = open, n = fret
  frets: number[];
  fingers?: number[]; // 1..4, 0 = open/muted
}

export const CHORDS: ChordShape[] = [
  { name: "C Major",  frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
  { name: "A Minor",  frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
  { name: "G Major",  frets: [3, 2, 0, 0, 0, 3],  fingers: [3, 2, 0, 0, 0, 4] },
  { name: "D Major",  frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
  { name: "E Minor",  frets: [0, 2, 2, 0, 0, 0],  fingers: [0, 2, 3, 0, 0, 0] },
  { name: "E Major",  frets: [0, 2, 2, 1, 0, 0],  fingers: [0, 2, 3, 1, 0, 0] },
  { name: "A Major",  frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0] },
  { name: "D Minor",  frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
];

// Given a chord shape, return the set of note names produced.
export function chordNotes(shape: ChordShape): Set<NoteName> {
  const s = new Set<NoteName>();
  shape.frets.forEach((f, i) => {
    if (f < 0) return;
    s.add(midiToNoteName(fretMidi(i, f)));
  });
  return s;
}

// Generate a random note prompt (string + fret)
export function randomNoteTarget(): { stringIdx: number; fret: number; midi: number } {
  const stringIdx = Math.floor(Math.random() * 6);
  const fret = Math.floor(Math.random() * (FRET_COUNT + 1));
  return { stringIdx, fret, midi: fretMidi(stringIdx, fret) };
}

// Pentatonic sequence generator
export function generatePentatonic(
  rootMidi: number,
  minor: boolean,
  length: number,
): { stringIdx: number; fret: number; midi: number }[] {
  const scale = minor ? PENT_MINOR : PENT_MAJOR;
  const notes = scale.map((iv) => rootMidi + iv);
  // extend octaves
  const pool = [
    ...notes,
    ...notes.map((n) => n + 12),
  ];
  const seq: number[] = [];
  let idx = 0;
  for (let i = 0; i < length; i++) {
    idx += Math.floor(Math.random() * 3) - 1; // walk
    idx = Math.max(0, Math.min(pool.length - 1, idx));
    seq.push(pool[idx]);
  }
  return seq.map((m) => findPositionForMidi(m));
}

export function generateChaos(length: number): { stringIdx: number; fret: number; midi: number }[] {
  return Array.from({ length }, () => randomNoteTarget());
}

// Find a nice fretboard position for a target midi
export function findPositionForMidi(midi: number): { stringIdx: number; fret: number; midi: number } {
  const opts: { stringIdx: number; fret: number }[] = [];
  for (let s = 0; s < 6; s++) {
    const fret = midi - STANDARD_TUNING[s].midi;
    if (fret >= 0 && fret <= FRET_COUNT) opts.push({ stringIdx: s, fret });
  }
  if (opts.length === 0) {
    // clamp
    return { stringIdx: 5, fret: 0, midi: STANDARD_TUNING[5].midi };
  }
  const pick = opts[Math.floor(opts.length / 2)];
  return { ...pick, midi };
}
