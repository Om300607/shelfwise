# Shelfwise — Library Book Issue & Return Management System

Shelfwise is a library circulation tool that lets a librarian add and manage a book catalog, generate a QR code per book, and issue/return books by scanning that QR code (or entering the Book ID manually). It tracks availability in real time and keeps a full issue/return history that can be exported as CSV.

**Live demo:** https://shelfwise.vercel.app  
**Repository:** https://github.com/Om300607/shelfwise

## How to run the project

```bash
git clone https://github.com/Om300607/shelfwise.git
cd shelfwise
npm install
npm run dev
```

Open `http://localhost:5173`.

Other scripts:
```bash
npm run build     # production build
npm run preview   # preview the production build locally
```

No database setup or environment variables are required to run this project — see **Data layer** below.

## Tech stack

- **Framework:** TanStack Start (React 19) with file-based routing via TanStack Router
- **Build tool:** Vite
- **Styling:** Tailwind CSS v4
- **QR codes:** `html5-qrcode` (camera scanning), `qrcode` (QR generation)
- **State/data:** custom store using `useSyncExternalStore`, persisted to the browser's `localStorage`

## Data layer (important implementation decision)

This implementation stores all data **client-side, in the browser's `localStorage`**, rather than through a backend REST API and a server-side database. All business logic — adding books, issuing, returning, duplicate-loan checks, availability checks — runs in `src/lib/library-store.ts` in the browser.

This was a deliberate scope decision to fit the available time. There are **no REST API endpoints and no server-side database** in this version. Given more time, the natural next step is to move this logic into TanStack Start server functions backed by Postgres, so that data is shared across devices/users instead of being local to one browser.

## Features implemented

**Catalog (`/catalog`)**
- Add a book with Title, Author, ISBN/Book ID, Category, Total Copies
- Generate and download a QR code per book
- Add extra copies to an existing book, or delete a book (blocked while it has an active loan)
- Search by title/author/Book ID, filter by category and by availability

**Scan desk (`/scan`)**
- Live camera QR scanning (`html5-qrcode`) or manual Book ID entry
- Displays the matched book's details and current availability
- Issue a book to a borrower (name + borrower ID + configurable loan period)
- Return a book, matched by borrower ID when a title has multiple concurrent loans
- Validation: rejects unknown Book IDs, books with zero available copies, and a borrower trying to double-issue the same title

**History (`/history`)**
- Full issue/return ledger, searchable by book/author/Book ID/borrower
- Filter by Issued / Overdue / Returned status
- Per-row overdue day count
- CSV export of the full (or filtered) history: Title, Author, Book ID, Borrower Name/ID, Issue Timestamp, Due Date, Return Timestamp, Status

**Dashboard (`/`)** — Admin overview (brownie subtask)
- Total copies, available copies, currently issued, and overdue counts
- List of currently issued books with borrower details and days-overdue badge
- Recent activity feed (last 5 issues/returns)
- One-click CSV export of the full history

## Additional features beyond the base requirements
- Live camera-based QR scanning (not just code lookup)
- Downloadable QR code image per book (PNG)
- Configurable loan period per issue (default 14 days)
- Overdue day counter on both the dashboard and history table

## Not implemented
- A server-side backend, REST API, and database (see **Data layer**)
- The optional AI-powered bonus feature

## Concepts learned
- File-based routing and SSR fundamentals with TanStack Router/Start
- Building a reactive external store with `useSyncExternalStore` instead of a state library
- Integrating device camera access for QR scanning in the browser
- Client-side CSV generation and file download via Blob URLs
- Tailwind CSS v4's new Vite plugin-based setup
- Deploying a TanStack Start SSR app to Vercel (Nitro's Vercel preset)