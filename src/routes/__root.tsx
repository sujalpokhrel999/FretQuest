import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppSidebar, MobileNav } from "../components/AppSidebar";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-primary text-glow">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Off the fretboard</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This page doesn't exist. Slide back to a familiar position.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">A string snapped</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong. Try again, or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "FretQuest — Learn Guitar Online with Real-Time Pitch Detection" },
      {
        name: "description",
        content:
          "Learn guitar online for free. FretQuest listens through your mic to teach notes, chords, scales, and riffs — with a built-in tuner, metronome, and voice-guided fretboard trainer.",
      },
      {
        name: "keywords",
        content:
          "learn guitar online, guitar notes, guitar chords, guitar tuner, fretboard trainer, guitar scales, pentatonic scale, guitar practice app, ear training, guitar riffs, free guitar lessons",
      },
      { name: "author", content: "FretQuest" },
      { name: "robots", content: "index, follow" },
      { property: "og:site_name", content: "FretQuest" },
      { property: "og:title", content: "FretQuest — Learn Guitar Online with Real-Time Pitch Detection" },
      {
        property: "og:description",
        content:
          "Free interactive guitar coach: tuner, chord trainer, scale drills, and voice-guided fretboard practice powered by real-time pitch detection.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://fretquest.lovable.app" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "FretQuest — Learn Guitar Online" },
      {
        name: "twitter:description",
        content:
          "Free interactive guitar trainer with real-time pitch detection, tuner, chord practice, and voice-guided note drills.",
      },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/tFtfCyJVhohuv8DPV6FWrVcbzV03/social-images/social-1783148847826-Gemini_Generated_Image_o3169zo3169zo316.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/tFtfCyJVhohuv8DPV6FWrVcbzV03/social-images/social-1783148847826-Gemini_Generated_Image_o3169zo3169zo316.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "FretQuest",
          url: "https://fretquest.lovable.app",
          applicationCategory: "EducationalApplication",
          operatingSystem: "Web",
          description:
            "Interactive guitar learning app with real-time pitch detection, tuner, chord trainer, scale drills, and voice-guided fretboard practice.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          audience: { "@type": "Audience", audienceType: "Guitar students, beginner and intermediate guitar players" },
          featureList: [
            "Real-time guitar tuner",
            "Voice-guided fretboard note trainer",
            "Chord recognition and practice",
            "Pentatonic scale and riff generator",
            "Metronome for rhythm training",
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <MobileNav />
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </QueryClientProvider>
  );
}
