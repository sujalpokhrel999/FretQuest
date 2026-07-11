import { createFileRoute, Link } from "@tanstack/react-router";
import { Fretboard } from "@/components/Fretboard";
import { ArrowRight, Guitar, Music2, Music3, Waves, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://fretquest.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "How do I learn guitar notes on the fretboard?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Use FretQuest's voice-guided Notes trainer: it announces a note and string (e.g. 'Play C on the 4th string') and listens through your microphone to verify you played it correctly.",
              },
            },
            {
              "@type": "Question",
              name: "Is FretQuest free to use for learning guitar online?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. FretQuest is a free browser-based guitar trainer with a tuner, chord practice, scales, and riff generator — no signup required.",
              },
            },
            {
              "@type": "Question",
              name: "Do I need special hardware to practice guitar with FretQuest?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "No. Any acoustic or electric guitar plus your device's microphone works. FretQuest uses real-time pitch detection in the browser.",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: Home,
});

const features = [
  {
    to: "/tuner",
    icon: Waves,
    title: "Visual Tuner",
    desc: "Needle-style digital tuner. Get every string dialed in before you drill.",
  },
  {
    to: "/notes",
    icon: Music2,
    title: "Notes & Scales",
    desc: "Prompted note challenges with streaks, points, and a running high score.",
  },
  {
    to: "/chords",
    icon: Music3,
    title: "Chord Trainer",
    desc: "Play chord shapes, we listen for every note ringing out.",
  },
  {
    to: "/riffs",
    icon: Zap,
    title: "Riffs & Leads",
    desc: "Pentatonic sequences or pure chaos — with optional rhythm mode.",
  },
] as const;

function Home() {
  return (
    <div className="px-6 md:px-10 py-10 md:py-16 max-w-6xl mx-auto">
      <div className="flex flex-col items-start gap-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Real-time pitch detection · Web Audio
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
          Practice guitar like a{" "}
          <span className="text-primary text-glow">game</span>.
          <br />
          Not a chore.
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Plug in your guitar or aim your mic. Fretwave listens as you play,
          scores your accuracy, and levels up your fretboard fluency across
          notes, chords, and lead lines.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/tuner"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground shadow-glow hover:opacity-90"
          >
            <Guitar className="h-4 w-4" />
            Start with the tuner
          </Link>
          <Link
            to="/notes"
            className="inline-flex items-center gap-2 rounded-lg border border-input bg-card px-5 py-3 font-semibold hover:bg-accent"
          >
            Jump into training
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <Link
              key={f.to}
              to={f.to}
              className="group rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:shadow-glow"
            >
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 grid place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{f.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-14 rounded-2xl border border-border bg-card/70 p-4 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Your fretboard</h3>
          <span className="text-xs text-muted-foreground font-mono">Standard tuning · E A D G B E</span>
        </div>
        <div className="overflow-x-auto">
          <Fretboard highlight={{ stringIdx: 4, fret: 5 }} showLabels />
        </div>
      </div>
    </div>
  );
}
