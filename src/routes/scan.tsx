import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeading } from "@/components/AppShell";
import { findByBookId, issueBook, returnBook, useLibrary } from "@/lib/library-store";
import type { Book } from "@/lib/library-types";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "Scan — Shelfwise" },
      {
        name: "description",
        content:
          "Scan a book's QR code with the device camera to issue or return it, with validation for unavailable books and invalid codes.",
      },
      { property: "og:title", content: "Scan — Shelfwise" },
      {
        property: "og:description",
        content: "Issue and return library books by scanning their QR code.",
      },
    ],
  }),
  component: ScanPage,
});

function ScanPage() {
  const { transactions } = useLibrary();
  const [scanning, setScanning] = useState(false);
  const [book, setBook] = useState<Book | null>(null);
  const [manualId, setManualId] = useState("");
  const [borrowerName, setBorrowerName] = useState("");
  const [borrowerId, setBorrowerId] = useState("");
  const [loanDays, setLoanDays] = useState("14");
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);

  const openLoans = book ? transactions.filter((t) => t.bookUid === book.id && !t.returnedAt) : [];

  function lookup(code: string) {
    const found = findByBookId(code);
    if (!found) {
      toast.error(`No book matches code "${code}"`);
      return;
    }
    setBook(found);
    setManualId(found.bookId);
    toast.success(`Found ${found.title}`);
  }

  async function stopScanner() {
    const s = scannerRef.current;
    scannerRef.current = null;
    setScanning(false);
    if (s) {
      try {
        await s.stop();
        s.clear();
      } catch {
        /* already stopped */
      }
    }
  }

  async function startScanner() {
    if (scannerRef.current) return;
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const instance = new Html5Qrcode("qr-reader");
      scannerRef.current = instance as unknown as {
        stop: () => Promise<void>;
        clear: () => void;
      };
      setScanning(true);
      await instance.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          lookup(decoded.trim());
          void stopScanner();
        },
        () => {},
      );
    } catch (err) {
      scannerRef.current = null;
      setScanning(false);
      toast.error(
        err instanceof Error ? `Camera unavailable: ${err.message}` : "Could not start the camera",
      );
    }
  }

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, []);

  function doIssue() {
    if (!book) return;
    try {
      const tx = issueBook({
        bookId: book.bookId,
        borrowerName,
        borrowerId,
        loanDays: Number(loanDays),
      });
      toast.success(`Issued to ${tx.borrowerName}, due ${new Date(tx.dueAt).toLocaleDateString()}`);
      setBook(findByBookId(book.bookId) ?? null);
      setBorrowerName("");
      setBorrowerId("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Issue failed");
    }
  }

  function doReturn() {
    if (!book) return;
    try {
      const tx = returnBook({
        bookId: book.bookId,
        borrowerId: borrowerId.trim() || undefined,
      });
      toast.success(`Returned by ${tx.borrowerName}`);
      setBook(findByBookId(book.bookId) ?? null);
      setBorrowerId("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Return failed");
    }
  }

  const field =
    "w-full rounded-2xl border border-glass-border bg-input px-4 py-2 text-sm outline-none placeholder:text-ink-soft focus:ring-2 focus:ring-ring";

  return (
    <AppShell>
      <PageHeading
        title="Scan desk"
        subtitle="Point the camera at a book's QR code, or type its ID"
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="glass-panel rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg">QR scanner</h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                scanning ? "bg-mint/60" : "bg-background/70"
              }`}
            >
              {scanning ? "Live" : "Idle"}
            </span>
          </div>

          <div className="relative mt-4 aspect-square overflow-hidden rounded-3xl bg-ink">
            <div
              id="qr-reader"
              className="absolute inset-0 [&_video]:size-full [&_video]:object-cover"
            />
            {!scanning && (
              <div className="absolute inset-0 grid place-items-center px-6 text-center">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-background/70">
                  Camera off
                </p>
              </div>
            )}
            <div className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-lilac/90" />
            {scanning && (
              <div className="sweep pointer-events-none absolute inset-x-8 top-1/2 h-0.5 rounded-full bg-lilac shadow-[0_0_16px_4px_oklch(0.8_0.09_295/0.7)]" />
            )}
          </div>

          <div className="mt-4 flex gap-2">
            {scanning ? (
              <button
                onClick={() => void stopScanner()}
                className="glass-panel-sm flex-1 rounded-2xl py-2.5 text-sm font-bold"
              >
                Stop camera
              </button>
            ) : (
              <button
                onClick={() => void startScanner()}
                className="gradient-brand flex-1 rounded-2xl py-2.5 text-sm font-bold text-primary-foreground shadow-md"
              >
                Start camera
              </button>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <input
              className={field}
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              placeholder="Or enter book ID (LB-2201)"
              aria-label="Book ID"
            />
            <button
              onClick={() => lookup(manualId)}
              className="shrink-0 whitespace-nowrap rounded-2xl bg-lilac/60 px-4 py-2 text-sm font-bold"
            >
              Look up
            </button>
          </div>
        </section>

        <section className="glass-panel rounded-3xl p-5">
          <h2 className="font-display text-lg">Detected book</h2>

          {!book ? (
            <p className="mt-4 text-sm text-ink-soft">
              Nothing scanned yet. Start the camera or look up a book ID to issue or return a copy.
            </p>
          ) : (
            <>
              <div className="mt-4 rounded-2xl bg-background/70 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                  {book.bookId} · {book.category}
                </p>
                <p className="mt-1 font-display text-base">{book.title}</p>
                <p className="text-xs text-ink-soft">{book.author}</p>
                <p className="mt-2 text-xs font-bold">
                  {book.availableCopies}/{book.totalCopies} copies on shelf
                </p>
              </div>

              {openLoans.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
                    Open loans
                  </p>
                  {openLoans.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setBorrowerId(t.borrowerId)}
                      className="flex w-full items-center justify-between rounded-2xl bg-background/70 px-3 py-2 text-left text-xs"
                    >
                      <span className="font-bold">
                        {t.borrowerName} · {t.borrowerId}
                      </span>
                      <span className="text-ink-soft">
                        due {new Date(t.dueAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-bold">
                  Borrower name
                  <input
                    className={`${field} mt-1`}
                    value={borrowerName}
                    onChange={(e) => setBorrowerName(e.target.value)}
                    placeholder="Jordan Pierce"
                  />
                </label>
                <label className="block text-sm font-bold">
                  Borrower ID
                  <input
                    className={`${field} mt-1`}
                    value={borrowerId}
                    onChange={(e) => setBorrowerId(e.target.value)}
                    placeholder="MEM-1042"
                  />
                </label>
                <label className="block text-sm font-bold">
                  Loan days
                  <input
                    type="number"
                    min={1}
                    className={`${field} mt-1`}
                    value={loanDays}
                    onChange={(e) => setLoanDays(e.target.value)}
                  />
                </label>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={doIssue}
                  className="rounded-2xl bg-mint/70 py-2.5 text-sm font-bold"
                >
                  Issue
                </button>
                <button
                  onClick={doReturn}
                  className="rounded-2xl bg-peach/70 py-2.5 text-sm font-bold"
                >
                  Return
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}
