export type Book = {
  id: string;
  bookId: string; // ISBN or library book ID, encoded in the QR code
  title: string;
  author: string;
  category: string;
  totalCopies: number;
  availableCopies: number;
  createdAt: string;
};

export type Transaction = {
  id: string;
  bookUid: string;
  bookId: string;
  title: string;
  author: string;
  borrowerName: string;
  borrowerId: string;
  issuedAt: string;
  dueAt: string;
  returnedAt: string | null;
};

export type LibraryData = {
  books: Book[];
  transactions: Transaction[];
};

export const CATEGORIES = [
  "Fiction",
  "Non-fiction",
  "Science",
  "History",
  "Technology",
  "Reference",
  "Children",
  "Poetry",
] as const;

export function daysOverdue(t: Transaction, now = new Date()): number {
  if (t.returnedAt) return 0;
  const due = new Date(t.dueAt).getTime();
  const diff = now.getTime() - due;
  if (diff <= 0) return 0;
  return Math.floor(diff / 86_400_000);
}

export function isOverdue(t: Transaction, now = new Date()): boolean {
  return daysOverdue(t, now) > 0;
}
