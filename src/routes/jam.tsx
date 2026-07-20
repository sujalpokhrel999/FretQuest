import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Play, Square, Sparkles, Loader2, Music4 } from "lucide-react";
import { Fretboard } from "@/components/Fretboard";
import { usePitch } from "@/hooks/use-pitch";
import { useBackingTrack, JAM_STYLES, type JamStyle } from "@/hooks/use-backing-track";
import {
  ALL_KEYS,
  chordProgression,
  pentatonicBoxPositions,
  pentatonicBoxStartFret,
  pentatonicNoteNames,
  scaleNoteNames,
  type Quality,
} from "@/lib/jam";
import { NOTE_NAMES, type NoteName } from "@/lib/music";
import { rateJam, type JamRating } from "@/lib/rate-jam.functions";

export const Route = createFileRoute("/jam")({
  head: () => ({
    meta: [
      { title: "AI Jam Partner — Guitar Improvisation Coach | FretQuest" },
      {
        name: "description",
        content:
          "Jam over AI-generated chord progressions in any key. See the matching pentatonic box position, play along, and get an instant AI rating of your improvisation.",
      },
      {
        name: "keywords",
        content:
          "guitar jam track, guitar improvisation, pentatonic scale positions, AI guitar coach, backing tracks, guitar practice AI",
      },
      { property: "og:title", content: "AI Jam Partner | FretQuest" },
      {
        property: "og:description",
        content: "Jam in any key with an AI backing track and get your solo rated.",
      },
      { property: "og:url", content: "https://fretquest.lovable.app/jam" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://fretquest.lovable.app/jam" }],
  }),
  component: JamPage,
});

function JamPage() {
  const [root, setRoot] = useState<NoteName>("A");
  const [quality, setQuality] = useState<Quality>("minor");
  const [bpm, setBpm] = useState(90);
  const [style, setStyle] = useState<JamStyle>("strum");
  const [sessionActive, setSessionActive] = useState(false);
  const [rating, setRating] = useState<JamRating | null>(null);
  const [rating_loading, setRatingLoading] = useState(false);
  const [rating_error, setRatingError] = useState<string | null>(null);

  const progression = useMemo(() => chordProgression(root, quality), [root, quality]);
  const scaleNotes = useMemo(() => scaleNoteNames(root, quality), [root, quality]);
  const pentNotes = useMemo(() => pentatonicNoteNames(root, quality), [root, quality]);
  const positions = useMemo(() => pentatonicBoxPositions(root, quality), [root, quality]);
  const boxFret = pentatonicBoxStartFret(root, quality);

  const backing = useBackingTrack({ progression, bpm, beatsPerChord: 4, style });

  // Session stats
  const startedAtRef = useRef(0);
  const statsRef = useRef({
    total: 0,
    inScale: 0,
    inPent: 0,
    root: 0,
    centsSum: 0,
    counts: {} as Record<string, number>,
  });
  const [liveNote, setLiveNote] = useState<NoteName | null>(null);
  const [liveTotal, setLiveTotal] = useState(0);

  const scaleSet = useMemo(() => new Set(scaleNotes), [scaleNotes]);
  const pentSet = useMemo(() => new Set(pentNotes), [pentNotes]);

  const lastNoteRef = useRef<{ note: NoteName; t: number } | null>(null);
  const onNote = useCallback(
    (n: { note: NoteName; cents: number }) => {
      if (!sessionActive) return;
      const now = performance.now();
      // debounce same-note re-triggers within 220ms
      const last = lastNoteRef.current;
      if (last && last.note === n.note && now - last.t < 220) return;
      lastNoteRef.current = { note: n.note, t: now };

      const s = statsRef.current;
      s.total += 1;
      s.centsSum += Math.abs(n.cents);
      s.counts[n.note] = (s.counts[n.note] ?? 0) + 1;
      if (scaleSet.has(n.note)) s.inScale += 1;
      if (pentSet.has(n.note)) s.inPent += 1;
      if (n.note === root) s.root += 1;
      setLiveNote(n.note);
      setLiveTotal(s.total);
    },
    [sessionActive, scaleSet, pentSet, root],
  );

  const pitch = usePitch({ onNote });

  const resetStats = () => {
    statsRef.current = { total: 0, inScale: 0, inPent: 0, root: 0, centsSum: 0, counts: {} };
    setLiveTotal(0);
    setLiveNote(null);
    setRating(null);
    setRatingError(null);
  };

  const startSession = async () => {
    resetStats();
    startedAtRef.current = performance.now();
    setSessionActive(true);
    backing.start();
    if (!pitch.listening) await pitch.start();
  };

  const rateFn = useServerFn(rateJam);

  const endSession = async () => {
    backing.stop();
    pitch.stop();
    setSessionActive(false);
    const s = statsRef.current;
    const durationSec = Math.max(0.1, (performance.now() - startedAtRef.current) / 1000);
    setRatingLoading(true);
    setRatingError(null);
    try {
      const r = await rateFn({
        data: {
          key: root,
          quality,
          scaleNotes,
          pentatonicNotes: pentNotes,
          chords: progression.map((c) => c.label),
          durationSec,
          totalNotes: s.total,
          uniqueNotes: Object.keys(s.counts).length,
          inScaleCount: s.inScale,
          inPentatonicCount: s.inPent,
          rootHits: s.root,
          notePlayCounts: s.counts,
          avgCentsOff: s.total ? s.centsSum / s.total : 0,
        },
      });
      setRating(r);
    } catch (e: any) {
      setRatingError(e?.message ?? "Failed to rate jam");
    } finally {
      setRatingLoading(false);
    }
  };

  useEffect(() => () => { backing.stop(); pitch.stop(); }, []); // eslint-disable-line

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-glow flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" />
            AI Jam Partner
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a key, jam over a live backing track, then get an AI rating of your solo.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Current Jam</div>
          <div className="text-2xl font-bold text-primary text-glow">
            {root} {quality === "major" ? "Major" : "Minor"}
          </div>
        </div>
      </header>

      {/* Controls */}
      <section className="rounded-xl border border-border bg-card/60 p-4 space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">
            Key
            <select
              className="mt-1 w-full rounded-md border border-input bg-background px-2 py-2 text-sm text-foreground"
              value={`${root}|${quality}`}
              onChange={(e) => {
                const [r, q] = e.target.value.split("|") as [NoteName, Quality];
                setRoot(r); setQuality(q);
              }}
              disabled={sessionActive}
            >
              {ALL_KEYS.map((k) => (
                <option key={k.label} value={`${k.root}|${k.quality}`}>{k.label}</option>
              ))}
            </select>
          </label>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">
            Tempo — {bpm} BPM
            <input
              type="range" min={60} max={140} step={1}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              disabled={sessionActive}
              className="mt-3 w-full accent-primary"
            />
          </label>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">
            Style
            <select
              className="mt-1 w-full rounded-md border border-input bg-background px-2 py-2 text-sm text-foreground"
              value={style}
              onChange={(e) => setStyle(e.target.value as JamStyle)}
              disabled={sessionActive}
            >
              {JAM_STYLES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            <div className="mt-1 text-[11px] normal-case tracking-normal text-muted-foreground/80">
              {JAM_STYLES.find((s) => s.id === style)?.hint}
            </div>
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          {JAM_STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => !sessionActive && setStyle(s.id)}
              disabled={sessionActive}
              className={[
                "text-xs rounded-full px-3 py-1.5 border transition",
                style === s.id
                  ? "bg-primary text-primary-foreground border-primary shadow-glow"
                  : "border-border text-foreground/80 hover:border-primary/40",
                sessionActive ? "opacity-60 cursor-not-allowed" : "",
              ].join(" ")}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Chord Progression
          <div className="mt-1 flex flex-wrap gap-2">
            {progression.map((c, i) => (
              <span
                key={i}
                className={[
                  "font-mono rounded-md px-3 py-1.5 text-sm border",
                  backing.playing && backing.chordIdx === i
                    ? "bg-primary text-primary-foreground border-primary shadow-glow"
                    : "border-border text-foreground/80",
                ].join(" ")}
              >
                {c.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Fretboard with pentatonic box */}
      <section className="rounded-xl border border-border bg-card/60 p-4">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Best Pentatonic Position
            </div>
            <div className="text-sm font-semibold">
              {root} {quality === "major" ? "Major" : "Minor"} Pentatonic — Box 1 (fret {boxFret})
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[color:var(--color-active)]" /> Root</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[color:var(--color-success)] opacity-70" /> Scale</span>
            {liveNote && <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-[color:var(--color-note)] opacity-60" /> Detected: <span className="font-mono text-foreground">{liveNote}</span></span>}
          </div>
        </div>
        <Fretboard positions={positions} litNote={liveNote} showLabels />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {NOTE_NAMES.map((n) => {
            const inScale = scaleSet.has(n);
            const inPent = pentSet.has(n);
            const isRoot = n === root;
            return (
              <span
                key={n}
                className={[
                  "font-mono text-xs rounded px-2 py-1 border",
                  isRoot
                    ? "bg-[color:var(--color-active)] text-background border-transparent"
                    : inPent
                    ? "bg-[color:var(--color-success)]/20 text-foreground border-[color:var(--color-success)]/40"
                    : inScale
                    ? "border-border text-foreground/80"
                    : "border-border/40 text-muted-foreground/50",
                ].join(" ")}
              >
                {n}
              </span>
            );
          })}
        </div>
      </section>

      {/* Session controls */}
      <section className="rounded-xl border border-border bg-card/60 p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <div className="text-xs uppercase text-muted-foreground tracking-wider">Notes played</div>
            <div className="font-mono text-xl font-bold text-primary">{liveTotal}</div>
          </div>
          <div className="text-sm">
            <div className="text-xs uppercase text-muted-foreground tracking-wider">Mic</div>
            <div className="flex items-center gap-1.5">
              {pitch.listening ? <Mic className="h-4 w-4 text-[color:var(--color-success)]" /> : <MicOff className="h-4 w-4 text-muted-foreground" />}
              <span className="text-sm">{pitch.listening ? "Live" : "Off"}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {!sessionActive ? (
            <button
              onClick={startSession}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90"
            >
              <Play className="h-4 w-4" /> Start Jam
            </button>
          ) : (
            <button
              onClick={endSession}
              className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:opacity-90"
            >
              <Square className="h-4 w-4" /> End & Rate
            </button>
          )}
        </div>
      </section>

      {pitch.error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {pitch.error}
        </div>
      )}

      {/* Rating */}
      {(rating_loading || rating || rating_error) && (
        <section className="rounded-xl border border-border bg-card/60 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Music4 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Session Rating</h2>
          </div>
          {rating_loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Analyzing your jam…
            </div>
          )}
          {rating_error && !rating_loading && (
            <div className="text-sm text-destructive">Couldn't rate this session: {rating_error}</div>
          )}
          {rating && !rating_loading && (
            <div className="space-y-4">
              <div className="flex items-end justify-between flex-wrap gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Overall</div>
                  <div className="flex items-baseline gap-3">
                    <div className="text-5xl font-bold text-primary text-glow">{rating.overallScore}</div>
                    <div className="text-2xl font-bold text-[color:var(--color-success)]">{rating.grade}</div>
                  </div>
                </div>
                <div className="text-sm max-w-md text-right">
                  <div className="font-semibold">{rating.headline}</div>
                  <div className="text-muted-foreground mt-1">{rating.breakdown}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  ["Key Adherence", rating.keyAdherence],
                  ["Scale Usage", rating.scaleUsage],
                  ["Variety", rating.variety],
                  ["Intonation", rating.intonation],
                ].map(([label, val]) => (
                  <div key={label as string} className="rounded-lg border border-border p-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
                    <div className="text-2xl font-bold">{val as number}</div>
                    <div className="mt-1 h-1.5 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${val}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              {rating.tips?.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Coach Tips</div>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {rating.tips.map((t, i) => <li key={i}>{t}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
