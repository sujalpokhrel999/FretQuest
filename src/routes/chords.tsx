import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, SkipForward } from "lucide-react";
import { usePitch } from "@/hooks/use-pitch";
import { ChordDiagram } from "@/components/ChordDiagram";
import { CHORDS, chordNotes, type ChordShape } from "@/lib/music";

export const Route = createFileRoute("/chords")({
  head: () => ({
    meta: [
      { title: "Guitar Chord Trainer — Learn Open Chords | FretQuest" },
      {
        name: "description",
        content:
          "Practice guitar chords with real-time detection. Learn open chords like C, G, D, Em, and Am — FretQuest listens for every note in the shape.",
      },
      { name: "keywords", content: "guitar chords, learn guitar chords, open chords, chord trainer, C major chord, G chord, guitar chord practice" },
      { property: "og:title", content: "Guitar Chord Trainer | FretQuest" },
      { property: "og:description", content: "Practice open chords with real-time note detection. Perfect your shapes visually and by ear." },
      { property: "og:url", content: "https://fretquest.lovable.app/chords" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://fretquest.lovable.app/chords" }],
  }),
  component: ChordsPage,
});

function pickRandomChord(exclude?: string): ChordShape {
  const opts = exclude ? CHORDS.filter((c) => c.name !== exclude) : CHORDS;
  return opts[Math.floor(Math.random() * opts.length)];
}

function ChordsPage() {
  const [chord, setChord] = useState<ChordShape>(() => pickRandomChord());
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [levelUp, setLevelUp] = useState(false);
  const heardRef = useRef<Set<string>>(new Set());
  const [heardTick, setHeardTick] = useState(0);
  const lastResetRef = useRef(0);

  const requiredNotes = useMemo(() => chordNotes(chord), [chord]);

  // Reset heard set when chord changes
  useEffect(() => {
    heardRef.current = new Set();
    setHeardTick((t) => t + 1);
  }, [chord]);

  // Also fade the heard set if silent for a while
  useEffect(() => {
    const id = setInterval(() => {
      if (performance.now() - lastResetRef.current > 2500 && heardRef.current.size > 0 && heardRef.current.size < requiredNotes.size) {
        heardRef.current = new Set();
        setHeardTick((t) => t + 1);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [requiredNotes]);

  const pitch = usePitch({
    minClarity: 0.8,
    minVolume: 0.01,
    onNote: (n) => {
      if (!requiredNotes.has(n.note)) return;
      lastResetRef.current = performance.now();
      if (!heardRef.current.has(n.note)) {
        heardRef.current.add(n.note);
        setHeardTick((t) => t + 1);
        if (heardRef.current.size >= requiredNotes.size) {
          setScore((s) => s + 25);
          setCompleted((c) => c + 1);
          setLevelUp(true);
          setTimeout(() => {
            setLevelUp(false);
            setChord((c) => pickRandomChord(c.name));
          }, 900);
        }
      }
    },
  });

  const heard = heardRef.current;
  void heardTick; // ensure rerender

  return (
    <div className="px-6 md:px-10 py-8 max-w-6xl mx-auto">
      <header className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Chord Trainer</h1>
          <p className="text-muted-foreground mt-1">
            Strum or arpeggiate. We check every note in the chord.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setChord((c) => pickRandomChord(c.name))}
            className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-card px-3 py-2 text-sm hover:bg-accent"
          >
            <SkipForward className="h-3.5 w-3.5" /> Skip
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className={[
            "rounded-3xl border p-6 md:p-8 transition",
            levelUp ? "border-success bg-success/10 shadow-glow scale-[1.01]" : "border-border bg-card",
          ].join(" ")}
        >
          <div className="max-w-xs mx-auto">
            <ChordDiagram chord={chord} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
              Notes in {chord.name}
            </div>
            <div className="flex flex-wrap gap-2">
              {[...requiredNotes].map((n) => {
                const done = heard.has(n);
                return (
                  <span
                    key={n}
                    className={[
                      "px-3 py-1.5 rounded-lg font-mono text-sm border transition",
                      done
                        ? "bg-success/15 border-success text-success text-glow"
                        : "bg-muted/40 border-border text-muted-foreground",
                    ].join(" ")}
                  >
                    {n}
                  </span>
                );
              })}
            </div>
            <div className="mt-4">
              <Progress value={heard.size} max={requiredNotes.size} />
              <div className="mt-2 text-xs text-muted-foreground">
                {heard.size} / {requiredNotes.size} notes detected
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Stat label="Chords cleared" value={completed} />
            <Stat label="Score" value={score} accent />
          </div>

          <div className="rounded-2xl border border-border bg-card/70 p-4 text-sm text-muted-foreground">
            Tip: play the chord slowly one string at a time (arpeggio) — the
            detector locks onto single notes more reliably than a full strum.
          </div>
        </div>
      </div>
    </div>
  );
}

function Progress({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, (value / Math.max(1, max)) * 100);
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div
        className="h-full bg-primary transition-all duration-300"
        style={{ width: `${pct}%`, boxShadow: "var(--shadow-glow)" }}
      />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={["mt-1 text-2xl font-bold font-mono", accent ? "text-primary text-glow" : ""].join(" ")}>
        {value}
      </div>
    </div>
  );
}
