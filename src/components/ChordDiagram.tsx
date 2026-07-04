import type { ChordShape } from "@/lib/music";

interface Props {
  chord: ChordShape;
  className?: string;
}

const W = 220;
const H = 240;
const PAD_L = 30;
const PAD_R = 20;
const PAD_T = 40;
const PAD_B = 30;
const STRINGS = 6;
const FRETS = 5;

export function ChordDiagram({ chord, className }: Props) {
  const cellW = (W - PAD_L - PAD_R) / (STRINGS - 1);
  const cellH = (H - PAD_T - PAD_B) / FRETS;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} style={{ width: "100%", height: "auto" }}>
      <text
        x={W / 2}
        y={22}
        textAnchor="middle"
        fontSize={18}
        fontWeight={700}
        fill="var(--color-foreground)"
      >
        {chord.name}
      </text>

      {/* nut */}
      <rect x={PAD_L - 2} y={PAD_T - 4} width={W - PAD_L - PAD_R + 4} height={4} fill="var(--color-foreground)" />

      {/* frets */}
      {Array.from({ length: FRETS + 1 }).map((_, i) => (
        <line
          key={i}
          x1={PAD_L}
          x2={W - PAD_R}
          y1={PAD_T + i * cellH}
          y2={PAD_T + i * cellH}
          stroke="var(--color-muted-foreground)"
          strokeOpacity={0.5}
          strokeWidth={1}
        />
      ))}

      {/* strings */}
      {Array.from({ length: STRINGS }).map((_, i) => (
        <line
          key={i}
          x1={PAD_L + i * cellW}
          x2={PAD_L + i * cellW}
          y1={PAD_T}
          y2={PAD_T + FRETS * cellH}
          stroke="var(--color-muted-foreground)"
          strokeOpacity={0.6}
          strokeWidth={1}
        />
      ))}

      {/* open/muted marks above nut */}
      {chord.frets.map((f, i) => {
        // i=0 -> low E on the LEFT in diagrams
        const x = PAD_L + i * cellW;
        const y = PAD_T - 14;
        if (f === -1) {
          return (
            <text key={i} x={x} y={y} textAnchor="middle" fontSize={14} fill="var(--color-muted-foreground)">
              ×
            </text>
          );
        }
        if (f === 0) {
          return <circle key={i} cx={x} cy={y - 2} r={5} fill="none" stroke="var(--color-foreground)" strokeWidth={1.5} />;
        }
        return null;
      })}

      {/* finger dots */}
      {chord.frets.map((f, i) => {
        if (f <= 0) return null;
        const x = PAD_L + i * cellW;
        const y = PAD_T + (f - 0.5) * cellH;
        const finger = chord.fingers?.[i];
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={11} fill="var(--color-primary)" />
            {finger ? (
              <text
                x={x}
                y={y + 4}
                textAnchor="middle"
                fontSize={12}
                fontWeight={700}
                fill="var(--color-primary-foreground)"
              >
                {finger}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
