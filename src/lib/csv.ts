import type { Transaction } from "./library-types";

function cell(value: string | number | null) {
  const s = value === null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function transactionsToCsv(rows: Transaction[]): string {
  const header = [
    "Book Title",
    "Author",
    "Book ID",
    "Issued To (Name)",
    "Borrower ID",
    "Issue Timestamp",
    "Due Date",
    "Return Timestamp",
    "Current Status",
  ];
  const body = rows.map((t) => {
    const overdue = !t.returnedAt && new Date(t.dueAt).getTime() < Date.now();
    return [
      t.title,
      t.author,
      t.bookId,
      t.borrowerName,
      t.borrowerId,
      new Date(t.issuedAt).toISOString(),
      new Date(t.dueAt).toISOString(),
      t.returnedAt ? new Date(t.returnedAt).toISOString() : "",
      t.returnedAt ? "Returned" : overdue ? "Overdue" : "Issued",
    ].map(cell);
  });
  return [header.map(cell), ...body].map((r) => r.join(",")).join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
