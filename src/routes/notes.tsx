import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, RotateCcw, Eye, EyeOff, Volume2, VolumeX } from "lucide-react";
import { usePitch } from "@/hooks/use-pitch";
import { Fretboard } from "@/components/Fretboard";
import {
  STANDARD_TUNING,
  midiToNoteName,
  randomNoteTarget,
} from "@/lib/music";
import { useSpeak, speakableNote, stringOrdinalLabel } from "@/hooks/use-speak";

export const Route = createFileRoute("/notes")({
  head: () => ({
    meta: [
      { title: "Guitar Notes Trainer — Learn the Fretboard | FretQuest" },
      {
        name: "description",
        content:
          "Learn guitar notes on every string with a voice-guided fretboard trainer. Free real-time pitch detection, streaks, and scoring to master the fretboard fast.",
      },
      { name: "keywords", content: "guitar notes, learn guitar fretboard, fretboard trainer, guitar note practice, ear training guitar, learn guitar online free" },
      { property: "og:title", content: "Guitar Notes Trainer — Learn the Fretboard | FretQuest" },
      { property: "og:description", content: "Voice-guided guitar note trainer with real-time pitch detection. Master the fretboard string by string." },
      { property: "og:url", content: "https://fretquest.lovable.app/notes" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://fretquest.lovable.app/notes" }],
  }),
  component: NotesPage,
});

function NotesPage() {
  const [target, setTarget] = useState(() => randomNoteTarget());
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [showHint, setShowHint] = useState(true);
  const [flash, setFlash] = useState<"success" | null>(null);
  const cooldownRef = useRef(0);

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    const h = Number(localStorage.getItem("fretwave.notes.high") ?? "0");
    if (!Number.isNaN(h)) setHighScore(h);
  }, []);

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("fretwave.notes.high", String(highScore));
    }
  }, [highScore]);

  const pitch = usePitch({
    minClarity: 0.93,
    minVolume: 0.02,
    onNote: (n) => {
      const now = performance.now();
      if (now < cooldownRef.current) return;
      const targetName = midiToNoteName(target.midi);
      if (n.note === targetName && Math.abs(n.cents) < 35) {
        cooldownRef.current = now + 700;
        setScore((s) => {
          const ns = s + 10;
          setHighScore((h) => Math.max(h, ns));
          return ns;
        });
        setStreak((s) => s + 1);
        setFlash("success");
        setTimeout(() => setFlash(null), 400);
        setTarget(randomNoteTarget());
      }
    },
  });

  const targetNote = midiToNoteName(target.midi);
  const stringLabel = STANDARD_TUNING[target.stringIdx].label;

  return (
    <div className="px-6 md:px-10 py-8 max-w-6xl mx-auto">
      <header className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Notes & Scales</h1>
          <p className="text-muted-foreground mt-1">Play the prompted note to earn points.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setStreak(0);
              setScore(0);
              setTarget(randomNoteTarget());
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-card px-3 py-2 text-sm hover:bg-accent"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
          <button
            onClick={() => setShowHint((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-card px-3 py-2 text-sm hover:bg-accent"
          >
            {showHint ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showHint ? "Hide fret hint" : "Show fret hint"}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div
          className={[
            "lg:col-span-2 rounded-3xl border p-8 md:p-10 transition-colors",
            flash === "success"
              ? "border-success bg-success/10 shadow-glow"
              : "border-border bg-card",
          ].join(" ")}
        >
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Play this note</div>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <div className="text-7xl md:text-8xl font-bold text-primary text-glow font-mono">{targetNote}</div>
            <div className="text-lg text-muted-foreground">
              on the <span className="text-foreground font-semibold">{stringLabel}</span> string
              {showHint && <> · fret <span className="text-foreground font-semibold">{target.fret}</span></>}
            </div>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Currently hearing:{" "}
            <span className="text-foreground font-mono">
              {pitch.note ? `${pitch.note.note}${pitch.note.octave} (${pitch.note.cents > 0 ? "+" : ""}${pitch.note.cents}¢)` : "—"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 lg:grid-cols-1 gap-4">
          <Stat label="Score" value={score} accent />
          <Stat label="Streak" value={streak} />
          <Stat label="High score" value={highScore} />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/70 p-4 md:p-6 overflow-x-auto">
        <Fretboard
          highlight={showHint ? target : null}
          litNote={pitch.note?.note ?? null}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={["mt-1 text-3xl font-bold font-mono", accent ? "text-primary text-glow" : ""].join(" ")}>
        {value}
      </div>
    </div>
  );
}
