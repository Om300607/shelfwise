import { useSyncExternalStore } from "react";
import type { Book, LibraryData, Transaction } from "./library-types";

const STORAGE_KEY = "shelfwise:v1";
const EMPTY: LibraryData = { books: [], transactions: [] };

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function iso(daysFromNow: number) {
  return new Date(Date.now() + daysFromNow * 86_400_000).toISOString();
}

function seed(): LibraryData {
  const mk = (
    bookId: string,
    title: string,
    author: string,
    category: string,
    total: number,
    available: number,
  ): Book => ({
    id: uid(),
    bookId,
    title,
    author,
    category,
    totalCopies: total,
    availableCopies: available,
    createdAt: iso(-40),
  });

  const books: Book[] = [
    mk("LB-2201", "The Salt Path", "Raynor Winn", "Non-fiction", 3, 2),
    mk("LB-1976", "Project Hail Mary", "Andy Weir", "Science", 4, 3),
    mk("LB-3390", "Quiet, Please", "Scott Douglas", "Non-fiction", 2, 1),
    mk("LB-0842", "Klara and the Sun", "Kazuo Ishiguro", "Fiction", 5, 5),
    mk("LB-4157", "The Overstory", "Richard Powers", "Fiction", 3, 3),
    mk("LB-5520", "A Brief History of Time", "Stephen Hawking", "Science", 2, 2),
    mk("LB-6613", "Clean Code", "Robert C. Martin", "Technology", 4, 4),
    mk("LB-7788", "Circe", "Madeline Miller", "Fiction", 3, 3),
  ];

  const open = (
    b: Book,
    borrowerName: string,
    borrowerId: string,
    issuedDaysAgo: number,
    dueInDays: number,
  ): Transaction => ({
    id: uid(),
    bookUid: b.id,
    bookId: b.bookId,
    title: b.title,
    author: b.author,
    borrowerName,
    borrowerId,
    issuedAt: iso(-issuedDaysAgo),
    dueAt: iso(dueInDays),
    returnedAt: null,
  });

  const transactions: Transaction[] = [
    open(books[0]!, "Jordan Pierce", "MEM-1042", 20, -6),
    open(books[1]!, "Aisha Khan", "MEM-2277", 17, -3),
    open(books[2]!, "Theo Marsh", "MEM-3391", 15, -1),
    {
      ...open(books[7]!, "Riley Cho", "MEM-5510", 30, -16),
      returnedAt: iso(-2),
    },
  ];

  return { books, transactions };
}

let cache: LibraryData | null = null;
const listeners = new Set<() => void>();

function read(): LibraryData {
  if (cache) return cache;
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as LibraryData) : seed();
  } catch {
    cache = seed();
  }
  if (!cache) cache = seed();
  return cache;
}

function write(next: LibraryData) {
  cache = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLibrary(): LibraryData {
  return useSyncExternalStore(
    subscribe,
    () => read(),
    () => EMPTY,
  );
}

export function getData() {
  return read();
}

/* ---------------- book management ---------------- */

export function addBook(input: {
  bookId: string;
  title: string;
  author: string;
  category: string;
  totalCopies: number;
}): Book {
  const data = read();
  const bookId = input.bookId.trim();
  if (!bookId) throw new Error("Book ID is required.");
  if (!input.title.trim()) throw new Error("Title is required.");
  if (!input.author.trim()) throw new Error("Author is required.");
  if (!Number.isFinite(input.totalCopies) || input.totalCopies < 1) {
    throw new Error("Total copies must be at least 1.");
  }
  if (data.books.some((b) => b.bookId.toLowerCase() === bookId.toLowerCase())) {
    throw new Error(`A book with ID ${bookId} already exists.`);
  }
  const book: Book = {
    id: uid(),
    bookId,
    title: input.title.trim(),
    author: input.author.trim(),
    category: input.category,
    totalCopies: Math.floor(input.totalCopies),
    availableCopies: Math.floor(input.totalCopies),
    createdAt: new Date().toISOString(),
  };
  write({ ...data, books: [book, ...data.books] });
  return book;
}

export function updateBook(id: string, patch: Partial<Omit<Book, "id">>) {
  const data = read();
  const books = data.books.map((b) => {
    if (b.id !== id) return b;
    const merged = { ...b, ...patch };
    const issued = b.totalCopies - b.availableCopies;
    if (patch.totalCopies !== undefined) {
      if (patch.totalCopies < issued) {
        throw new Error(`${issued} copies are currently issued.`);
      }
      merged.availableCopies = patch.totalCopies - issued;
    }
    return merged;
  });
  write({ ...data, books });
}

export function deleteBook(id: string) {
  const data = read();
  const book = data.books.find((b) => b.id === id);
  if (!book) throw new Error("Book not found.");
  const open = data.transactions.some((t) => t.bookUid === id && !t.returnedAt);
  if (open) throw new Error("Cannot delete a book that is currently issued.");
  write({ ...data, books: data.books.filter((b) => b.id !== id) });
}

export function findByBookId(bookId: string): Book | undefined {
  const needle = bookId.trim().toLowerCase();
  return read().books.find((b) => b.bookId.toLowerCase() === needle);
}

/* ---------------- circulation ---------------- */

export function issueBook(input: {
  bookId: string;
  borrowerName: string;
  borrowerId: string;
  loanDays?: number;
}): Transaction {
  const data = read();
  const book = data.books.find((b) => b.bookId.toLowerCase() === input.bookId.trim().toLowerCase());
  if (!book) throw new Error(`Unknown book ID: ${input.bookId}`);
  if (!input.borrowerName.trim()) throw new Error("Borrower name is required.");
  if (!input.borrowerId.trim()) throw new Error("Borrower ID is required.");
  if (book.availableCopies < 1) {
    throw new Error(`"${book.title}" has no available copies.`);
  }
  const dupe = data.transactions.find(
    (t) =>
      t.bookUid === book.id &&
      !t.returnedAt &&
      t.borrowerId.toLowerCase() === input.borrowerId.trim().toLowerCase(),
  );
  if (dupe) {
    throw new Error(`${input.borrowerId} already has a copy of this book out.`);
  }

  const loanDays = input.loanDays && input.loanDays > 0 ? input.loanDays : 14;
  const tx: Transaction = {
    id: uid(),
    bookUid: book.id,
    bookId: book.bookId,
    title: book.title,
    author: book.author,
    borrowerName: input.borrowerName.trim(),
    borrowerId: input.borrowerId.trim(),
    issuedAt: new Date().toISOString(),
    dueAt: iso(loanDays),
    returnedAt: null,
  };

  write({
    books: data.books.map((b) =>
      b.id === book.id ? { ...b, availableCopies: b.availableCopies - 1 } : b,
    ),
    transactions: [tx, ...data.transactions],
  });
  return tx;
}

export function returnBook(input: {
  bookId: string;
  borrowerId?: string | undefined;
}): Transaction {
  const data = read();
  const book = data.books.find((b) => b.bookId.toLowerCase() === input.bookId.trim().toLowerCase());
  if (!book) throw new Error(`Unknown book ID: ${input.bookId}`);

  const openTxs = data.transactions.filter((t) => t.bookUid === book.id && !t.returnedAt);
  if (openTxs.length === 0) {
    throw new Error(`"${book.title}" is not currently issued.`);
  }
  const target = input.borrowerId
    ? openTxs.find((t) => t.borrowerId.toLowerCase() === input.borrowerId!.trim().toLowerCase())
    : openTxs[0];
  if (!target) {
    throw new Error(`No open loan for borrower ${input.borrowerId}.`);
  }

  const returned: Transaction = { ...target, returnedAt: new Date().toISOString() };
  write({
    books: data.books.map((b) =>
      b.id === book.id
        ? { ...b, availableCopies: Math.min(b.totalCopies, b.availableCopies + 1) }
        : b,
    ),
    transactions: data.transactions.map((t) => (t.id === target.id ? returned : t)),
  });
  return returned;
}

export function resetLibrary() {
  write(seed());
}
