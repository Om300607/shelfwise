import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, PageHeading } from "@/components/AppShell";
import { useLibrary } from "@/lib/library-store";
import { daysOverdue } from "@/lib/library-types";
import { downloadCsv, transactionsToCsv } from "@/lib/csv";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History — Shelfwise" },
      {
        name: "description",
        content:
          "Full issue and return history with search, status filters, overdue days and CSV export of every transaction.",
      },
      { property: "og:title", content: "History — Shelfwise" },
      {
        property: "og:description",
        content: "Search the complete library issue/return ledger and export it as CSV.",
      },
    ],
  }),
  component: History,
});

function History() {
  const { transactions } = useLibrary();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions
      .filter((t) => {
        const matchQ =
          !q ||
          t.title.toLowerCase().includes(q) ||
          t.author.toLowerCase().includes(q) ||
          t.bookId.toLowerCase().includes(q) ||
          t.borrowerName.toLowerCase().includes(q) ||
          t.borrowerId.toLowerCase().includes(q);
        const late = daysOverdue(t) > 0;
        const matchS =
          status === "all" ||
          (status === "issued" && !t.returnedAt) ||
          (status === "returned" && !!t.returnedAt) ||
          (status === "overdue" && late);
        return matchQ && matchS;
      })
      .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
  }, [transactions, query, status]);

  const field =
    "w-full rounded-2xl border border-glass-border bg-input px-4 py-2 text-sm outline-none placeholder:text-ink-soft focus:ring-2 focus:ring-ring";

  return (
    <AppShell>
      <PageHeading
        title="Issue &amp; return history"
        subtitle={`${rows.length} of ${transactions.length} transactions`}
        actions={
          <button
            onClick={() =>
              downloadCsv(
                `shelfwise-history-${new Date().toISOString().slice(0, 10)}.csv`,
                transactionsToCsv(rows),
              )
            }
            className="gradient-brand rounded-full px-5 py-2 text-sm font-bold text-primary-foreground shadow-md"
          >
            Export CSV
          </button>
        }
      />

      <div className="glass-panel-sm mt-5 grid gap-3 rounded-3xl p-4 sm:grid-cols-[2fr_1fr]">
        <input
          className={field}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search book, borrower or ID"
          aria-label="Search transactions"
        />
        <select
          className={field}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="issued">Issued</option>
          <option value="overdue">Overdue</option>
          <option value="returned">Returned</option>
        </select>
      </div>

      <div className="glass-panel mt-5 overflow-x-auto rounded-3xl p-2">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="text-left text-xs font-bold uppercase tracking-wide text-ink-soft">
              <th className="px-4 py-3">Book</th>
              <th className="px-4 py-3">Issued to</th>
              <th className="px-4 py-3">Issued</th>
              <th className="px-4 py-3">Returned</th>
              <th className="px-4 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const late = daysOverdue(t);
              return (
                <tr key={t.id} className="align-top">
                  <td className="px-4 py-3">
                    <span className="block font-extrabold">{t.title}</span>
                    <span className="block text-xs text-ink-soft">
                      {t.author} · {t.bookId}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="block">{t.borrowerName}</span>
                    <span className="block text-xs text-ink-soft">{t.borrowerId}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-soft">
                    {new Date(t.issuedAt).toLocaleString()}
                    <span className="block">due {new Date(t.dueAt).toLocaleDateString()}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-soft">
                    {t.returnedAt ? new Date(t.returnedAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        t.returnedAt ? "bg-mint/70" : late > 0 ? "bg-rose/70" : "bg-butter/70"
                      }`}
                    >
                      {t.returnedAt
                        ? "Returned"
                        : late > 0
                          ? `${late} day${late === 1 ? "" : "s"} overdue`
                          : "Issued"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-6 text-center text-sm text-ink-soft">No transactions match.</p>
        )}
      </div>
    </AppShell>
  );
}
