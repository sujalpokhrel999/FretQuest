// Jam-partner musical helpers: keys, scales, chord progressions, and
// pentatonic box positions.
import { NOTE_NAMES, type NoteName, PENT_MAJOR, PENT_MINOR, STANDARD_TUNING } from "./music";

export type Quality = "major" | "minor";

export interface JamKey {
  root: NoteName;
  quality: Quality;
  label: string; // "A Minor", "C Major"
}

export const ALL_KEYS: JamKey[] = NOTE_NAMES.flatMap((n) => [
  { root: n, quality: "major" as Quality, label: `${n} Major` },
  { root: n, quality: "minor" as Quality, label: `${n} Minor` },
]);

// Diatonic scale intervals (semitones from root)
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];

export function scaleNoteNames(root: NoteName, quality: Quality): NoteName[] {
  const rootIdx = NOTE_NAMES.indexOf(root);
  const iv = quality === "major" ? MAJOR_SCALE : MINOR_SCALE;
  return iv.map((s) => NOTE_NAMES[(rootIdx + s) % 12]);
}

export function pentatonicNoteNames(root: NoteName, quality: Quality): NoteName[] {
  const rootIdx = NOTE_NAMES.indexOf(root);
  const iv = quality === "major" ? PENT_MAJOR : PENT_MINOR;
  return iv.map((s) => NOTE_NAMES[(rootIdx + s) % 12]);
}

// Standard chord progressions to jam over — diatonic scale-degrees.
// Numerals map to scale steps (1-indexed).
const MAJOR_PROG = [1, 5, 6, 4]; // I V vi IV
const MINOR_PROG = [1, 6, 3, 7]; // i VI III VII (natural minor)

export interface JamChord {
  root: NoteName;
  quality: Quality;
  label: string; // e.g. "Am", "F"
  rootMidi: number; // playable octave for the backing synth
}

function chordAtDegree(root: NoteName, quality: Quality, degree: number): JamChord {
  const scale = quality === "major" ? MAJOR_SCALE : MINOR_SCALE;
  const rootIdx = NOTE_NAMES.indexOf(root);
  const semis = scale[degree - 1];
  const chordRootIdx = (rootIdx + semis) % 12;
  const chordRoot = NOTE_NAMES[chordRootIdx];
  // Chord quality by degree, keyed to parent scale
  const majorQualByDegree: Quality[] = ["major", "minor", "minor", "major", "major", "minor", "minor"];
  const minorQualByDegree: Quality[] = ["minor", "minor", "major", "minor", "minor", "major", "major"];
  const q = (quality === "major" ? majorQualByDegree : minorQualByDegree)[degree - 1];
  const label = q === "minor" ? `${chordRoot}m` : chordRoot;
  // choose a comfortable midi octave (around C3-B3)
  const baseMidi = 48 + chordRootIdx; // C3 + offset
  return { root: chordRoot, quality: q, label, rootMidi: baseMidi };
}

export function chordProgression(root: NoteName, quality: Quality): JamChord[] {
  const prog = quality === "major" ? MAJOR_PROG : MINOR_PROG;
  return prog.map((d) => chordAtDegree(root, quality, d));
}

// Pentatonic "box 1" starting position:
//   - Minor pentatonic box 1: root on 6th string at fret N.
//   - Major pentatonic box 1: root on 6th string at fret N (3 frets below relative minor).
// Returns the starting fret on the 6th (low E) string.
export function pentatonicBoxStartFret(root: NoteName, quality: Quality): number {
  const rootIdx = NOTE_NAMES.indexOf(root);
  const lowEIdx = NOTE_NAMES.indexOf("E");
  let fret = (rootIdx - lowEIdx + 12) % 12;
  if (quality === "major") {
    // major pentatonic box 1 shares shape with minor pentatonic 3 frets down
    fret = (fret - 3 + 12) % 12;
  }
  return fret;
}

// Return every (string, fret) position of the pentatonic scale between
// startFret and startFret + 4 (the classic box shape).
export function pentatonicBoxPositions(
  root: NoteName,
  quality: Quality,
): { stringIdx: number; fret: number; isRoot: boolean }[] {
  const scale = new Set(pentatonicNoteNames(root, quality));
  const startFret = pentatonicBoxStartFret(root, quality);
  const out: { stringIdx: number; fret: number; isRoot: boolean }[] = [];
  for (let s = 0; s < 6; s++) {
    for (let f = startFret; f <= startFret + 3; f++) {
      const midi = STANDARD_TUNING[s].midi + f;
      const name = NOTE_NAMES[((midi % 12) + 12) % 12];
      if (scale.has(name)) {
        out.push({ stringIdx: s, fret: f, isRoot: name === root });
      }
    }
  }
  return out;
}
