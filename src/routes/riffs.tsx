import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, RefreshCw, Play, Pause } from "lucide-react";
import { usePitch } from "@/hooks/use-pitch";
import { useMetronome } from "@/hooks/use-metronome";
import { Fretboard } from "@/components/Fretboard";
import {
  generateChaos,
  generatePentatonic,
  midiToNoteName,
  NOTE_NAMES,
  type NoteName,
} from "@/lib/music";

export const Route = createFileRoute("/riffs")({
  head: () => ({
    meta: [
      { title: "Riffs & Leads Generator — Fretwave" },
      {
        name: "description",
        content:
          "Practice lead guitar with generated pentatonic riffs or pure fretboard chaos. Optional rhythm mode with metronome.",
      },
    ],
  }),
  component: RiffsPage,
});

type Mode = "pentatonic-minor" | "pentatonic-major" | "chaos";

function RiffsPage() {
  const [mode, setMode] = useState<Mode>("pentatonic-minor");
  const [rootNote, setRootNote] = useState<NoteName>("A");
  const [length, setLength] = useState(6);
  const [rhythm, setRhythm] = useState(false);
  const [runId, setRunId] = useState(0);

  const sequence = useMemo(() => {
    if (mode === "chaos") return generateChaos(length);
    const minor = mode === "pentatonic-minor";
    // find a root midi in a reasonable register around A3 (57)
    const idx = NOTE_NAMES.indexOf(rootNote);
    const baseMidi = 45 + idx; // starts near A2
    const rootMidi = baseMidi >= 52 ? baseMidi : baseMidi + 12; // aim ~E3+
    return generatePentatonic(rootMidi, minor, length);
  }, [mode, rootNote, length, runId]);

  const [cursor, setCursor] = useState(0);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const cooldownRef = useRef(0);

  useEffect(() => {
    setCursor(0);
  }, [sequence]);

  const current = sequence[cursor];

  const pitch = usePitch({
    minClarity: 0.93,
    minVolume: 0.02,
    onNote: (n) => {
      if (!current) return;
      const now = performance.now();
      if (now < cooldownRef.current) return;
      const targetName = midiToNoteName(current.midi);
      if (n.note === targetName && Math.abs(n.cents) < 40) {
        cooldownRef.current = now + 350;
        setScore((s) => s + 5);
        setCursor((c) => c + 1);
      }
    },
  });

  const metronome = useMetronome(90);

  const complete = current === undefined;
  useEffect(() => {
    if (complete) {
      const t = setTimeout(() => {
        setRunId((r) => r + 1);
      }, 900);
      return () => clearTimeout(t);
    }
  }, [complete]);

  return (
    <div className="px-6 md:px-10 py-8 max-w-6xl mx-auto">
      <header className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Riffs & Leads</h1>
          <p className="text-muted-foreground mt-1">Play the sequence note by note. The next target lights up on the fretboard.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setRunId((r) => r + 1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-card px-3 py-2 text-sm hover:bg-accent"
          >
            <RefreshCw className="h-3.5 w-3.5" /> New riff
          </button>
          <button
            onClick={pitch.listening ? pitch.stop : pitch.start}
            className={[
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 font-semibold",
              pitch.listening
                ? "bg-destructive text-destructive-foreground"
                : "bg-primary text-primary-foreground shadow-glow",
            ].join(" ")}
          >
            {pitch.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {pitch.listening ? "Stop" : "Listen"}
          </button>
        </div>
      </header>

      {pitch.error && (
        <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm">
          Microphone error: {pitch.error}
        </div>
      )}

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <Select
          label="Mode"
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          options={[
            { value: "pentatonic-minor", label: "Pentatonic — Minor" },
            { value: "pentatonic-major", label: "Pentatonic — Major" },
            { value: "chaos", label: "Chaos / Random" },
          ]}
        />
        <Select
          label="Root note"
          value={rootNote}
          onChange={(v) => setRootNote(v as NoteName)}
          disabled={mode === "chaos"}
          options={NOTE_NAMES.map((n) => ({ value: n, label: n }))}
        />
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Length: {length}</div>
          <input
            type="range"
            min={4}
            max={8}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="w-full accent-[var(--color-primary)]"
          />
        </div>
        <div className="rounded-xl border border-border bg-card p-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Rhythm mode</div>
            <div className="text-xs text-muted-foreground">Metronome guide</div>
          </div>
          <button
            onClick={() => setRhythm((v) => !v)}
            className={[
              "px-3 py-1.5 rounded-md text-xs font-semibold",
              rhythm ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            ].join(" ")}
          >
            {rhythm ? "On" : "Off"}
          </button>
        </div>
      </div>

      {/* Metronome bar */}
      {rhythm && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-4 flex items-center gap-4 flex-wrap">
          <button
            onClick={metronome.running ? metronome.stop : metronome.start}
            className="inline-flex items-center gap-1.5 rounded-lg bg-active text-primary-foreground px-3 py-2 text-sm font-semibold"
            style={{ background: "var(--color-active)", color: "var(--color-background)" }}
          >
            {metronome.running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {metronome.running ? "Stop" : "Start"}
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            <span className="font-mono text-sm text-muted-foreground">BPM</span>
            <input
              type="range"
              min={40}
              max={200}
              value={metronome.bpm}
              onChange={(e) => metronome.setBpm(Number(e.target.value))}
              className="flex-1 accent-[var(--color-primary)]"
            />
            <span className="font-mono font-bold w-10 text-right">{metronome.bpm}</span>
          </div>
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={[
                  "h-3 w-3 rounded-full transition",
                  metronome.running && metronome.beat === i
                    ? i === 0
                      ? "bg-primary shadow-glow"
                      : "bg-active"
                    : "bg-muted",
                ].join(" ")}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sequence display */}
      <div className="rounded-3xl border border-border bg-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Sequence</div>
          <div className="flex gap-4 text-sm font-mono">
            <span>Score <span className="text-primary font-bold ml-1">{score}</span></span>
            <span>Misses <span className="text-muted-foreground font-bold ml-1">{misses}</span></span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {sequence.map((n, i) => {
            const done = i < cursor;
            const active = i === cursor;
            return (
              <div
                key={i}
                className={[
                  "min-w-[64px] rounded-xl border px-3 py-3 text-center transition",
                  active
                    ? "border-active bg-active/15 text-active shadow-note scale-105"
                    : done
                      ? "border-success/50 bg-success/10 text-success"
                      : "border-border bg-muted/30 text-muted-foreground",
                ].join(" ")}
                style={active ? { color: "var(--color-active)" } : done ? { color: "var(--color-success)" } : undefined}
              >
                <div className="text-xl font-bold font-mono">{midiToNoteName(n.midi)}</div>
                <div className="text-[10px] mt-0.5 opacity-70 font-mono">
                  S{6 - n.stringIdx}·F{n.fret}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          {complete ? (
            <span className="text-success text-glow font-semibold">Riff cleared! Generating next…</span>
          ) : current ? (
            <>
              Now play <span className="font-mono text-active font-bold" style={{ color: "var(--color-active)" }}>{midiToNoteName(current.midi)}</span>{" "}
              — hearing{" "}
              <span className="font-mono text-foreground">
                {pitch.note ? `${pitch.note.note}${pitch.note.octave}` : "—"}
              </span>
            </>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/70 p-4 md:p-6 overflow-x-auto">
        <Fretboard highlight={current ?? null} litNote={pitch.note?.note ?? null} />
      </div>

      {/* Unused-var guard */}
      <button hidden onClick={() => setMisses((m) => m)} />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <label className={["rounded-xl border border-border bg-card p-3 block", disabled ? "opacity-50" : ""].join(" ")}>
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full bg-transparent font-semibold outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-card">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
