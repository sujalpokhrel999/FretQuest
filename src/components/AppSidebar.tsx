import { Link, useRouterState } from "@tanstack/react-router";
import { Guitar, Music2, Music3, Sparkles, Waves, Zap } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: Guitar },
  { to: "/tuner", label: "Tuner", icon: Waves },
  { to: "/notes", label: "Notes & Scales", icon: Music2 },
  { to: "/chords", label: "Chords", icon: Music3 },
  { to: "/riffs", label: "Riffs & Leads", icon: Zap },
  { to: "/jam", label: "AI Jam Partner", icon: Sparkles },
] as const;

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden md:flex sticky top-0 h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="px-5 py-6 flex items-center gap-2">
        <div className="h-9 w-9 grid place-items-center rounded-xl bg-primary text-primary-foreground shadow-glow">
          <Guitar className="h-5 w-5" />
        </div>
        <div>
          <div className="font-bold tracking-tight leading-none">Fretwave</div>
          <div className="text-xs text-muted-foreground mt-1">Real-time guitar coach</div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {items.map((item) => {
          const active = pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={[
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-primary text-glow"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              ].join(" ")}
            >
              <Icon
                className={[
                  "h-4 w-4 transition-colors",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                ].join(" ")}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 text-[11px] text-muted-foreground/70 border-t border-sidebar-border">
        Plug in, pluck a note, level up.
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="md:hidden sticky top-0 z-30 bg-sidebar/95 backdrop-blur border-b border-sidebar-border">
      <div className="flex overflow-x-auto no-scrollbar gap-1 px-3 py-2">
        {items.map((item) => {
          const active = pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={[
                "shrink-0 flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium",
                active
                  ? "bg-sidebar-accent text-primary"
                  : "text-sidebar-foreground/80",
              ].join(" ")}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
