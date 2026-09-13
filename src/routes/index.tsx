import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell, PageHeading } from "@/components/AppShell";
import { useLibrary } from "@/lib/library-store";
import { daysOverdue, isOverdue } from "@/lib/library-types";
import { transactionsToCsv, downloadCsv } from "@/lib/csv";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Shelfwise Circulation Desk" },
      {
        name: "description",
        content:
          "Live library dashboard: total, available, issued and overdue books, plus current loans and recent circulation activity.",
      },
      { property: "og:title", content: "Dashboard — Shelfwise Circulation Desk" },
      {
        property: "og:description",
        content:
          "Live library dashboard with availability stats, current loans and overdue tracking.",
      },
    ],
  }),
  component: Dashboard,
});

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "lilac" | "mint" | "peach" | "rose";
}) {
  const bg = {
    lilac: "bg-lilac/40",
    mint: "bg-mint/50",
    peach: "bg-peach/50",
    rose: "bg-rose/50",
  }[tone];
  return (
    <div className="glass-panel-sm rounded-3xl p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">{label}</p>
        <span className={`grid size-8 place-items-center rounded-xl ${bg}`} />
      </div>
      <p className="mt-2 font-display text-3xl">{value}</p>
      <p className="text-xs text-ink-soft">{hint}</p>
    </div>
  );
}

function Dashboard() {
  const { books, transactions } = useLibrary();

  const stats = useMemo(() => {
    const total = books.reduce((n, b) => n + b.totalCopies, 0);
    const available = books.reduce((n, b) => n + b.availableCopies, 0);
    const openLoans = transactions.filter((t) => !t.returnedAt);
    return {
      total,
      available,
      issued: openLoans.length,
      overdue: openLoans.filter((t) => isOverdue(t)).length,
      titles: books.length,
      openLoans: [...openLoans].sort(
        (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(),
      ),
      recent: [...transactions]
        .sort(
          (a, b) =>
            new Date(b.returnedAt ?? b.issuedAt).getTime() -
            new Date(a.returnedAt ?? a.issuedAt).getTime(),
        )
        .slice(0, 5),
    };
  }, [books, transactions]);

  return (
    <AppShell>
      <PageHeading
        title="Good morning, Mia"
        subtitle={`${stats.overdue} book${stats.overdue === 1 ? "" : "s"} to chase · ${stats.issued} currently on loan`}
        actions={
          <>
            <button
              onClick={() =>
                downloadCsv(
                  `shelfwise-history-${new Date().toISOString().slice(0, 10)}.csv`,
                  transactionsToCsv(transactions),
                )
              }
              className="glass-panel-sm rounded-full px-4 py-2 text-sm font-bold"
            >
              Export CSV
            </button>
            <Link
              to="/scan"
              className="gradient-brand rounded-full px-5 py-2 text-sm font-bold text-primary-foreground shadow-md"
            >
              Scan a book
            </Link>
          </>
        }
      />

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total copies"
          value={stats.total.toLocaleString()}
          hint={`${stats.titles} titles catalogued`}
          tone="lilac"
        />
        <StatCard
          label="Available"
          value={stats.available.toLocaleString()}
          hint="ready to issue"
          tone="mint"
        />
        <StatCard
          label="Issued"
          value={stats.issued.toLocaleString()}
          hint="out with readers"
          tone="peach"
        />
        <StatCard
          label="Overdue"
          value={stats.overdue.toLocaleString()}
          hint="need follow-up"
          tone="rose"
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <section className="glass-panel rounded-3xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg">Currently issued</h2>
            <span className="rounded-full bg-peach/60 px-3 py-1 text-xs font-bold">
              {stats.overdue} overdue
            </span>
          </div>
          {stats.openLoans.length === 0 ? (
            <p className="mt-4 text-sm text-ink-soft">
              Nothing is on loan right now. Scan a book to issue it.
            </p>
          ) : (
            <div className="mt-4 space-y-2.5">
              {stats.openLoans.map((t) => {
                const late = daysOverdue(t);
                return (
                  <div
                    key={t.id}
                    className="flex flex-wrap items-center gap-3 rounded-2xl bg-background/70 p-3"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-lilac/40 font-display text-xs">
                      {t.title.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-40 flex-1 leading-tight">
                      <span className="block text-sm font-extrabold">{t.title}</span>
                      <span className="block text-xs text-ink-soft">
                        {t.borrowerName} · {t.borrowerId} · {t.bookId}
                      </span>
                    </span>
                    <span className="text-xs text-ink-soft">
                      due {new Date(t.dueAt).toLocaleDateString()}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        late > 0 ? "bg-rose/70" : "bg-mint/70"
                      }`}
                    >
                      {late > 0 ? `${late} day${late === 1 ? "" : "s"} late` : "On time"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="glass-panel rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg">Recent activity</h2>
            <Link to="/history" className="text-xs font-bold text-ink-soft">
              View all
            </Link>
          </div>
          <div className="mt-4 space-y-2.5">
            {stats.recent.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-2xl bg-background/70 p-3">
                <span
                  className={`grid size-9 place-items-center rounded-xl text-sm ${
                    t.returnedAt ? "bg-mint/50" : "bg-lilac/40"
                  }`}
                >
                  {t.returnedAt ? "✓" : "↑"}
                </span>
                <span className="flex-1 leading-tight">
                  <span className="block text-sm font-extrabold">
                    {t.returnedAt ? "Returned" : "Issued"} · {t.title}
                  </span>
                  <span className="block text-xs text-ink-soft">
                    {t.borrowerName} · {new Date(t.returnedAt ?? t.issuedAt).toLocaleString()}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
