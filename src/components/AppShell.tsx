import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/catalog", label: "Catalog" },
  { to: "/scan", label: "Scan" },
  { to: "/history", label: "History" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -left-16 size-96 rounded-full bg-lilac/50 blur-3xl floaty" />
      <div className="pointer-events-none absolute top-40 -right-24 size-[28rem] rounded-full bg-mint/50 blur-3xl floaty" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 size-96 rounded-full bg-rose/40 blur-3xl floaty" />

      <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <header className="glass-panel flex flex-wrap items-center justify-between gap-3 rounded-3xl p-3">
          <Link to="/" className="flex items-center gap-3">
            <span className="gradient-brand grid size-11 place-items-center rounded-2xl text-lg font-bold text-primary-foreground shadow-md">
              Sh
            </span>
            <span className="block">
              <span className="block font-display text-lg leading-none">Shelfwise</span>
              <span className="block text-xs text-ink-soft">
                Issue &amp; return, made breezy
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-1 rounded-full bg-background/60 p-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/" }}
                className="rounded-full px-4 py-1.5 text-sm font-semibold text-ink-soft transition-colors"
                activeProps={{ className: "bg-background text-ink font-bold shadow-sm" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-lilac/50 font-display text-sm">
              MO
            </span>
            <span className="block leading-tight">
              <span className="block text-sm font-extrabold">Mia Okafor</span>
              <span className="block text-xs text-ink-soft">Front desk</span>
            </span>
          </div>
        </header>

        <main>{children}</main>

        <footer className="glass-panel-sm mt-6 flex flex-wrap items-center justify-between gap-2 rounded-3xl px-5 py-3 text-xs text-ink-soft">
          <p>Shelfwise · Cedar Hollow Public Library</p>
          <p>Local circulation terminal</p>
        </footer>
      </div>
    </div>
  );
}

export function PageHeading({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl">{title}</h1>
        <p className="text-sm text-ink-soft">{subtitle}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
