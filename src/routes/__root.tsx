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
      { title: "FretQuest - Interactive Guitar Tuner, Scale & Chord Trainer" },
      {
        name: "description",
        content:
          "Learn guitar with real-time microphone pitch detection. Practice notes, chords, riffs, and stay in tune with an integrated tuner and metronome.",
      },
      { property: "og:title", content: "FretQuest - Interactive Guitar Tuner, Scale & Chord Trainer" },
      {
        property: "og:description",
        content:
          "Interactive dark-mode guitar coach with pitch detection, chord trainer, riff generator, tuner, and metronome.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "FretQuest - Interactive Guitar Tuner, Scale & Chord Trainer" },
      { name: "description", content: "Master the guitar fret board with FretQuest. Features real-time pitch detection, customized scales drills, chord diagrams, and random riff challenges." },
      { property: "og:description", content: "Master the guitar fret board with FretQuest. Features real-time pitch detection, customized scales drills, chord diagrams, and random riff challenges." },
      { name: "twitter:description", content: "Master the guitar fret board with FretQuest. Features real-time pitch detection, customized scales drills, chord diagrams, and random riff challenges." },
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
