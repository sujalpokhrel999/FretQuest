import {
  FRET_COUNT,
  STANDARD_TUNING,
  fretMidi,
  midiToNoteName,
  type NoteName,
} from "@/lib/music";

interface Props {
  highlight?: { stringIdx: number; fret: number } | null;
  showLabels?: boolean;
  litNote?: NoteName | null; // e.g. currently detected note - shows all matches
  /** Overlay a fixed set of positions (e.g. pentatonic box). */
  positions?: { stringIdx: number; fret: number; isRoot?: boolean }[];
  className?: string;
}

const STRING_SPACING = 26;
const FRET_WIDTH = 62;
const PAD_L = 56;
const PAD_R = 24;
const PAD_TB = 22;
const DOT_FRETS = [3, 5, 7, 9];

export function Fretboard({ highlight, showLabels = true, litNote, positions, className }: Props) {
  const width = PAD_L + PAD_R + (FRET_COUNT + 1) * FRET_WIDTH;
  const height = PAD_TB * 2 + STRING_SPACING * 5;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ width: "100%", height: "auto" }}
    >
      {/* nut */}
      <rect
        x={PAD_L - 4}
        y={PAD_TB - 6}
        width={5}
        height={STRING_SPACING * 5 + 12}
        fill="var(--color-foreground)"
        opacity={0.85}
      />

      {/* fretboard bg */}
      <rect
        x={PAD_L}
        y={PAD_TB - 6}
        width={FRET_COUNT * FRET_WIDTH}
        height={STRING_SPACING * 5 + 12}
        fill="color-mix(in oklab, var(--color-card) 92%, black)"
        rx={4}
      />

      {/* inlays */}
      {DOT_FRETS.map((f) => (
        <circle
          key={f}
          cx={PAD_L + f * FRET_WIDTH - FRET_WIDTH / 2}
          cy={PAD_TB + (STRING_SPACING * 5) / 2}
          r={5}
          fill="var(--color-muted-foreground)"
          opacity={0.35}
        />
      ))}
      {/* 12th fret double dots */}
      <circle
        cx={PAD_L + 12 * FRET_WIDTH - FRET_WIDTH / 2}
        cy={PAD_TB + STRING_SPACING * 1.2}
        r={5}
        fill="var(--color-muted-foreground)"
        opacity={0.35}
      />
      <circle
        cx={PAD_L + 12 * FRET_WIDTH - FRET_WIDTH / 2}
        cy={PAD_TB + STRING_SPACING * 3.8}
        r={5}
        fill="var(--color-muted-foreground)"
        opacity={0.35}
      />

      {/* fret lines */}
      {Array.from({ length: FRET_COUNT + 1 }).map((_, i) => (
        <line
          key={i}
          x1={PAD_L + i * FRET_WIDTH}
          x2={PAD_L + i * FRET_WIDTH}
          y1={PAD_TB - 6}
          y2={PAD_TB + STRING_SPACING * 5 + 6}
          stroke="var(--color-muted-foreground)"
          strokeWidth={1.4}
          opacity={0.45}
        />
      ))}

      {/* strings (draw high on top visually: reverse) */}
      {STANDARD_TUNING.map((s, i) => {
        const y = PAD_TB + (5 - i) * STRING_SPACING;
        const thickness = 0.8 + (5 - i) * 0.25;
        return (
          <g key={i}>
            <text
              x={PAD_L - 14}
              y={y + 4}
              textAnchor="end"
              fontSize={11}
              fill="var(--color-muted-foreground)"
              fontFamily="var(--font-mono)"
            >
              {s.name}
            </text>
            <line
              x1={PAD_L}
              x2={PAD_L + FRET_COUNT * FRET_WIDTH}
              y1={y}
              y2={y}
              stroke="var(--color-foreground)"
              strokeOpacity={0.55}
              strokeWidth={thickness}
            />
          </g>
        );
      })}

      {/* fret numbers */}
      {Array.from({ length: FRET_COUNT + 1 }).map((_, i) => (
        <text
          key={i}
          x={i === 0 ? PAD_L - 20 : PAD_L + i * FRET_WIDTH - FRET_WIDTH / 2}
          y={height - 4}
          textAnchor="middle"
          fontSize={10}
          fill="var(--color-muted-foreground)"
          fontFamily="var(--font-mono)"
        >
          {i}
        </text>
      ))}

      {/* lit notes across the neck (matching detected/target note class) */}
      {litNote &&
        Array.from({ length: 6 }).flatMap((_, s) =>
          Array.from({ length: FRET_COUNT + 1 }).map((_, f) => {
            const n = midiToNoteName(fretMidi(s, f));
            if (n !== litNote) return null;
            const cx = f === 0 ? PAD_L - 22 : PAD_L + f * FRET_WIDTH - FRET_WIDTH / 2;
            const cy = PAD_TB + (5 - s) * STRING_SPACING;
            return (
              <circle
                key={`${s}-${f}`}
                cx={cx}
                cy={cy}
                r={7}
                fill="var(--color-note)"
                opacity={0.35}
              />
            );
          }),
        )}

      {/* fixed positions overlay (e.g. pentatonic box) */}
      {positions?.map((p, i) => {
        const cx = p.fret === 0 ? PAD_L - 22 : PAD_L + p.fret * FRET_WIDTH - FRET_WIDTH / 2;
        const cy = PAD_TB + (5 - p.stringIdx) * STRING_SPACING;
        const color = p.isRoot ? "var(--color-active)" : "var(--color-success)";
        return (
          <g key={`p-${i}`}>
            <circle cx={cx} cy={cy} r={p.isRoot ? 10 : 8} fill={color} opacity={p.isRoot ? 0.95 : 0.55} stroke="var(--color-background)" strokeWidth={1} />
            {p.isRoot && showLabels && (
              <text x={cx} y={cy + 3.5} textAnchor="middle" fontSize={9} fontWeight={700} fill="var(--color-background)" fontFamily="var(--font-mono)">
                R
              </text>
            )}
          </g>
        );
      })}

      {/* highlight target */}
      {highlight && (() => {
        const s = highlight.stringIdx;
        const f = highlight.fret;
        const cx = f === 0 ? PAD_L - 22 : PAD_L + f * FRET_WIDTH - FRET_WIDTH / 2;
        const cy = PAD_TB + (5 - s) * STRING_SPACING;
        return (
          <g>
            <circle cx={cx} cy={cy} r={13} fill="var(--color-active)" opacity={0.25} />
            <circle
              cx={cx}
              cy={cy}
              r={10}
              fill="var(--color-active)"
              stroke="var(--color-background)"
              strokeWidth={1.5}
            />
            {showLabels && (
              <text
                x={cx}
                y={cy + 3.5}
                textAnchor="middle"
                fontSize={10}
                fontWeight={700}
                fill="var(--color-background)"
                fontFamily="var(--font-mono)"
              >
                {midiToNoteName(fretMidi(s, f))}
              </text>
            )}
          </g>
        );
      })()}
    </svg>
  );
}
