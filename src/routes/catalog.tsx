import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeading } from "@/components/AppShell";
import { BookQrCode, downloadQr } from "@/components/BookQrCode";
import { addBook, deleteBook, updateBook, useLibrary } from "@/lib/library-store";
import { CATEGORIES } from "@/lib/library-types";

export const Route = createFileRoute("/catalog")({
  head: () => ({
    meta: [
      { title: "Catalog — Shelfwise" },
      {
        name: "description",
        content:
          "Add and manage library book records, generate a QR code per book, and search or filter by title, author, category and availability.",
      },
      { property: "og:title", content: "Catalog — Shelfwise" },
      {
        property: "og:description",
        content:
          "Manage book records and generate printable QR codes for every title in the library.",
      },
    ],
  }),
  component: Catalog,
});

function Catalog() {
  const { books } = useLibrary();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [qrFor, setQrFor] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    author: "",
    bookId: "",
    category: CATEGORIES[0] as string,
    totalCopies: "1",
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return books.filter((b) => {
      const matchQ =
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.bookId.toLowerCase().includes(q);
      const matchC = category === "all" || b.category === category;
      const matchA =
        availability === "all" ||
        (availability === "available" ? b.availableCopies > 0 : b.availableCopies === 0);
      return matchQ && matchC && matchA;
    });
  }, [books, query, category, availability]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const book = addBook({
        title: form.title,
        author: form.author,
        bookId: form.bookId,
        category: form.category,
        totalCopies: Number(form.totalCopies),
      });
      toast.success(`Added "${book.title}"`);
      setForm({ title: "", author: "", bookId: "", category: CATEGORIES[0], totalCopies: "1" });
      setShowForm(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add book");
    }
  }

  const field =
    "w-full rounded-2xl border border-glass-border bg-input px-4 py-2 text-sm outline-none placeholder:text-ink-soft focus:ring-2 focus:ring-ring";

  return (
    <AppShell>
      <PageHeading
        title="Catalog"
        subtitle={`${books.length} titles · ${filtered.length} shown`}
        actions={
          <button
            onClick={() => setShowForm((v) => !v)}
            className="gradient-brand rounded-full px-5 py-2 text-sm font-bold text-primary-foreground shadow-md"
          >
            {showForm ? "Close form" : "Add book"}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={submit} className="glass-panel mt-5 grid gap-3 rounded-3xl p-5 sm:grid-cols-2">
          <label className="block text-sm font-bold sm:col-span-2">
            Title
            <input
              className={`${field} mt-1`}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="The Salt Path"
              required
            />
          </label>
          <label className="block text-sm font-bold">
            Author
            <input
              className={`${field} mt-1`}
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
              placeholder="Raynor Winn"
              required
            />
          </label>
          <label className="block text-sm font-bold">
            ISBN / Book ID
            <input
              className={`${field} mt-1`}
              value={form.bookId}
              onChange={(e) => setForm({ ...form, bookId: e.target.value })}
              placeholder="LB-9001"
              required
            />
          </label>
          <label className="block text-sm font-bold">
            Category
            <select
              className={`${field} mt-1`}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-bold">
            Total copies
            <input
              type="number"
              min={1}
              className={`${field} mt-1`}
              value={form.totalCopies}
              onChange={(e) => setForm({ ...form, totalCopies: e.target.value })}
              required
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="gradient-brand rounded-full px-5 py-2 text-sm font-bold text-primary-foreground shadow-md"
            >
              Save book
            </button>
          </div>
        </form>
      )}

      <div className="glass-panel-sm mt-5 grid gap-3 rounded-3xl p-4 sm:grid-cols-[2fr_1fr_1fr]">
        <input
          className={field}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, author or book ID"
          aria-label="Search books"
        />
        <select
          className={field}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className={field}
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
          aria-label="Filter by availability"
        >
          <option value="all">Any availability</option>
          <option value="available">Available</option>
          <option value="issued">All copies issued</option>
        </select>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((b) => (
          <article key={b.id} className="glass-panel rounded-3xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-base leading-tight">{b.title}</h2>
                <p className="text-xs text-ink-soft">{b.author}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                  b.availableCopies > 0 ? "bg-mint/70" : "bg-peach/70"
                }`}
              >
                {b.availableCopies > 0 ? "Available" : "Issued"}
              </span>
            </div>

            <dl className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-lilac/30 px-2.5 py-1 font-bold">{b.category}</span>
              <span className="rounded-full bg-background/70 px-2.5 py-1">{b.bookId}</span>
              <span className="rounded-full bg-background/70 px-2.5 py-1">
                {b.availableCopies}/{b.totalCopies} on shelf
              </span>
            </dl>

            {qrFor === b.id && (
              <div className="mt-4 grid place-items-center rounded-2xl bg-background/80 p-4">
                <BookQrCode bookId={b.bookId} size={150} className="rounded-xl" />
                <button
                  onClick={() => downloadQr(b.bookId, b.title)}
                  className="mt-3 rounded-full bg-mint/70 px-4 py-1.5 text-xs font-bold"
                >
                  Download PNG
                </button>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
              <button
                onClick={() => setQrFor(qrFor === b.id ? null : b.id)}
                className="rounded-full bg-lilac/50 px-3 py-1.5"
              >
                {qrFor === b.id ? "Hide QR" : "Show QR"}
              </button>
              <button
                onClick={() => {
                  try {
                    updateBook(b.id, { totalCopies: b.totalCopies + 1 });
                    toast.success("Copy added");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Update failed");
                  }
                }}
                className="rounded-full bg-butter/60 px-3 py-1.5"
              >
                + copy
              </button>
              <button
                onClick={() => {
                  try {
                    deleteBook(b.id);
                    toast.success("Book removed");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Delete failed");
                  }
                }}
                className="rounded-full bg-rose/60 px-3 py-1.5"
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="glass-panel-sm mt-5 rounded-3xl p-6 text-center text-sm text-ink-soft">
          No books match these filters.
        </p>
      )}
    </AppShell>
  );
}
