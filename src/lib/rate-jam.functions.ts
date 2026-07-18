import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callGatewayJson } from "./ai-gateway.server";

const RateJamInput = z.object({
  key: z.string(),
  quality: z.enum(["major", "minor"]),
  scaleNotes: z.array(z.string()),
  pentatonicNotes: z.array(z.string()),
  chords: z.array(z.string()),
  durationSec: z.number(),
  totalNotes: z.number(),
  uniqueNotes: z.number(),
  inScaleCount: z.number(),
  inPentatonicCount: z.number(),
  rootHits: z.number(),
  notePlayCounts: z.record(z.string(), z.number()),
  avgCentsOff: z.number(),
});

export type RateJamInput = z.infer<typeof RateJamInput>;

export interface JamRating {
  overallScore: number; // 0-100
  grade: string; // "A+" / "B" / etc
  keyAdherence: number; // 0-100
  scaleUsage: number; // 0-100
  variety: number; // 0-100
  intonation: number; // 0-100
  headline: string;
  breakdown: string; // 2-3 sentences
  tips: string[]; // 2-4 actionable tips
}

export const rateJam = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => RateJamInput.parse(d))
  .handler(async ({ data }): Promise<JamRating> => {
    const user = `You are an expert guitar coach rating a jam session. Respond in strict JSON matching this TypeScript type:

{
  "overallScore": number, // 0-100
  "grade": string, // "A+","A","B+","B","C","D","F"
  "keyAdherence": number, // 0-100 how well the player stayed in key ${data.key} ${data.quality}
  "scaleUsage": number, // 0-100 coverage & choice of scale notes
  "variety": number, // 0-100 melodic variety
  "intonation": number, // 0-100 tuning accuracy
  "headline": string, // short punchy verdict
  "breakdown": string, // 2-3 sentences
  "tips": string[]  // 2-4 concrete practice tips
}

Jam session data:
- Key: ${data.key} ${data.quality}
- Diatonic scale notes: ${data.scaleNotes.join(", ")}
- Pentatonic notes: ${data.pentatonicNotes.join(", ")}
- Backing chords: ${data.chords.join(" - ")}
- Duration: ${data.durationSec.toFixed(1)}s
- Total notes played: ${data.totalNotes}
- Unique notes: ${data.uniqueNotes}
- Notes in-scale: ${data.inScaleCount} (${data.totalNotes ? Math.round((data.inScaleCount / data.totalNotes) * 100) : 0}%)
- Notes in-pentatonic: ${data.inPentatonicCount}
- Root note hits: ${data.rootHits}
- Note frequency: ${Object.entries(data.notePlayCounts).map(([n, c]) => `${n}:${c}`).join(", ") || "none"}
- Average cents off perfect pitch: ${data.avgCentsOff.toFixed(1)}

Be encouraging but honest. Return ONLY the JSON object.`;

    if (data.totalNotes === 0) {
      return {
        overallScore: 0,
        grade: "F",
        keyAdherence: 0,
        scaleUsage: 0,
        variety: 0,
        intonation: 0,
        headline: "No notes detected",
        breakdown:
          "The mic didn't catch any notes during the session. Check your input level and try again — pluck a few notes to warm up.",
        tips: ["Check microphone permissions", "Move closer to your amp or mic", "Pick harder for cleaner detection"],
      };
    }

    return await callGatewayJson<JamRating>({ user });
  });
