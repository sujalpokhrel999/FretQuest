import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Mic, MicOff, Wand2 } from "lucide-react";
import { usePitch } from "@/hooks/use-pitch";
import { STANDARD_TUNING, noteToFrequency } from "@/lib/music";

export const Route = createFileRoute("/tuner")({
  head: () => ({
    meta: [
      { title: "Free Online Guitar Tuner — Standard Tuning | FretQuest" },
      {
        name: "description",
        content:
          "Free online guitar tuner with a visual needle. Tune your acoustic or electric guitar in standard EADGBE tuning using your microphone.",
      },
      { name: "keywords", content: "guitar tuner, online guitar tuner, free guitar tuner, standard tuning, EADGBE, tune guitar by ear, mic guitar tuner" },
      { property: "og:title", content: "Free Online Guitar Tuner | FretQuest" },
      { property: "og:description", content: "Precise real-time guitar tuner using your device microphone. Standard tuning, visual needle, no download." },
      { property: "og:url", content: "https://fretquest.lovable.app/tuner" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://fretquest.lovable.app/tuner" }],
  }),
  component: TunerPage,
});

function TunerPage() {
  const pitch = usePitch({ minClarity: 0.92, minVolume: 0.01 });
  const [target, setTarget] = useState<number | null>(null); // midi

  // Nearest tuning string if no manual target
  const activeTarget = useMemo(() => {
    if (target !== null) return target;
    if (!pitch.note) return null;
    let best = STANDARD_TUNING[0].midi;
    let bestD = Infinity;
    for (const s of STANDARD_TUNING) {
      const d = Math.abs(s.midi - pitch.note.midi);
      if (d < bestD) {
        bestD = d;
        best = s.midi;
      }
    }
    return best;
  }, [pitch.note, target]);

  // cents deviation vs active target
  const cents = useMemo(() => {
    if (!activeTarget || !pitch.frequency || pitch.clarity < 0.9) return 0;
    const targetFreq = noteToFrequency(activeTarget);
    return Math.max(-50, Math.min(50, 1200 * Math.log2(pitch.frequency / targetFreq)));
  }, [pitch.frequency, pitch.clarity, activeTarget]);

  const inTune = Math.abs(cents) < 5 && pitch.clarity > 0.9;

  return (
    <div className="px-6 md:px-10 py-8 max-w-5xl mx-auto">
      <header className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Tuner</h1>
          <p className="text-muted-foreground mt-1">
            Standard tuning · Pluck a string, watch the needle land at center.
          </p>
        </div>
        <button
          onClick={pitch.listening ? pitch.stop : pitch.start}
          className={[
            "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 font-semibold transition",
            pitch.listening
              ? "bg-destructive text-destructive-foreground"
              : "bg-primary text-primary-foreground shadow-glow hover:opacity-90",
          ].join(" ")}
        >
          {pitch.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {pitch.listening ? "Stop" : "Enable microphone"}
        </button>
      </header>

      {pitch.error && (
        <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
          Microphone error: {pitch.error}
        </div>
      )}

      <section className="rounded-3xl border border-border bg-card p-6 md:p-10">
        <TunerNeedle cents={cents} inTune={inTune} active={pitch.listening && pitch.clarity > 0.9} />

        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <Stat label="Note" value={pitch.note ? `${pitch.note.note}${pitch.note.octave}` : "—"} accent />
          <Stat label="Frequency" value={pitch.frequency ? `${pitch.frequency.toFixed(1)} Hz` : "—"} />
          <Stat label="Cents" value={pitch.listening ? `${cents > 0 ? "+" : ""}${cents.toFixed(0)}` : "—"} />
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">Target string</h2>
          <button
            onClick={() => setTarget(null)}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Wand2 className="h-3 w-3" /> Auto-detect nearest
          </button>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {STANDARD_TUNING.map((s) => {
            const active = activeTarget === s.midi;
            return (
              <button
                key={s.name}
                onClick={() => setTarget(s.midi)}
                className={[
                  "rounded-xl border px-3 py-3 font-mono text-sm transition",
                  active
                    ? "border-primary bg-primary/10 text-primary shadow-glow"
                    : "border-border bg-card hover:border-primary/40",
                ].join(" ")}
              >
                <div className="text-xl font-bold">{s.name}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-secondary/50 border border-border py-4">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={["mt-1 text-2xl font-bold font-mono", accent ? "text-primary text-glow" : ""].join(" ")}>
        {value}
      </div>
    </div>
  );
}

function TunerNeedle({ cents, inTune, active }: { cents: number; inTune: boolean; active: boolean }) {
  // -50..+50 -> -60..+60 degrees
  const angle = active ? (cents / 50) * 60 : 0;
  const color = !active
    ? "var(--color-muted-foreground)"
    : inTune
      ? "var(--color-success)"
      : "var(--color-active)";

  return (
    <div className="relative w-full aspect-[2/1] max-w-2xl mx-auto">
      <svg viewBox="0 0 400 220" className="w-full h-full">
        {/* arc */}
        <path
          d="M 30 190 A 170 170 0 0 1 370 190"
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={2}
        />
        {/* tick marks */}
        {Array.from({ length: 11 }).map((_, i) => {
          const t = i / 10;
          const a = -Math.PI + t * Math.PI;
          const r1 = 165;
          const r2 = i === 5 ? 145 : 155;
          const cx = 200 + Math.cos(a) * r1;
          const cy = 190 + Math.sin(a) * r1;
          const x2 = 200 + Math.cos(a) * r2;
          const y2 = 190 + Math.sin(a) * r2;
          const centerTick = i === 5;
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={x2}
              y2={y2}
              stroke={centerTick ? "var(--color-success)" : "var(--color-muted-foreground)"}
              strokeWidth={centerTick ? 2 : 1}
              opacity={centerTick ? 1 : 0.6}
            />
          );
        })}

        {/* labels */}
        <text x={30} y={210} fontSize={11} fill="var(--color-muted-foreground)" fontFamily="var(--font-mono)">
          −50
        </text>
        <text x={200} y={210} textAnchor="middle" fontSize={11} fill="var(--color-success)" fontFamily="var(--font-mono)">
          IN TUNE
        </text>
        <text x={370} y={210} textAnchor="end" fontSize={11} fill="var(--color-muted-foreground)" fontFamily="var(--font-mono)">
          +50
        </text>

        {/* needle */}
        <g transform={`translate(200 190) rotate(${angle})`} style={{ transition: "transform 90ms linear" }}>
          <line x1={0} y1={0} x2={0} y2={-155} stroke={color} strokeWidth={3} strokeLinecap="round" />
          <circle cx={0} cy={0} r={9} fill={color} />
          <circle cx={0} cy={0} r={4} fill="var(--color-background)" />
        </g>
      </svg>
    </div>
  );
}
