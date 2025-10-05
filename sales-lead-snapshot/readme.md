# 🧠 Sales Lead Snapshot (2 Agents)

Turn screenshots into structured **leads** and **ready-to-send outreach emails** — all in one lightweight Next.js app.

## 🚀 Goal

Upload or drag & drop a **screenshot** (e.g., LinkedIn profile, company page, conference photo)  
→ Agent A extracts lead info → Agent B writes a personalized outreach email  
→ Saved to SQLite with optional dedupe.

---

## 🧩 Architecture

| Layer | Tech | Description |
|-------|------|--------------|
| Frontend | Next.js (App Router) + Tailwind + shadcn/ui | Upload UI, list, detail, export CSV |
| Backend | Next.js API routes | Handle upload → agents → DB |
| Agents | OpenAI (gpt-4o-mini + text-embedding-3-small) | A: extract from image, B: generate email |
| Database | Prisma + SQLite (`file:./dev.db`) | Store leads, embeddings (BLOB) |
| File Storage | Local `/uploads` | Saved PNGs from user upload |
| Deduplication | Cosine similarity (brute-force in SQLite) | Optional, simple check for similar leads |

---

## 🧠 Agents

### Agent A — Vision Extractor
- Input: Screenshot (PNG)
- Output: JSON `{ name, title, company, website, domain, location, notes }`
- Notes: Keeps all fields normalized and minimal. Returns `null` if unknown.

### Agent B — Outreach Writer
- Input: Extracted lead + your product context.
- Output: 1 short, friendly outreach email (~90 words).
- Tone: specific, friendly, no hard sell.
- Ends with a soft question.

---

## 🗃️ Database Schema

```prisma
// prisma/schema.prisma
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

generator client {
  provider = "prisma-client-js"
}

model Lead {
  id           String   @id @default(cuid())
  createdAt    DateTime @default(now())
  imagePath    String
  sourceUrl    String?
  name         String?
  title        String?
  company      String?
  website      String?
  domain       String?
  location     String?
  notes        String?
  openerEmail  String?
  embedding    Bytes?
}
```

## ⚙️ Setup

1️⃣ Install dependencies
pnpm install

2️⃣ Run migrations
pnpm db:migrate

3️⃣ Create .env.local
OPENAI_API_KEY=sk-xxxxxx

4️⃣ Start dev server
pnpm dev


Then open: http://localhost:3000

## 🧪 Test Flow (Manual)

Open the app and upload a screenshot (PNG).

Wait a few seconds — agents process it inline.

See a lead card with extracted info + outreach email.

Click Copy email or Export CSV to download all leads.

## 🧪 API Routes

| Route             | Method | Description                           |
| ----------------- | ------ | ------------------------------------- |
| `/api/upload`     | `POST` | Upload image → run agents → save lead |
| `/api/leads`      | `GET`  | List all leads                        |
| `/api/leads/:id`  | `GET`  | Lead detail                           |
| `/api/export.csv` | `GET`  | Export all leads as CSV               |


## 📁 File Structure

```md
/
├─ app/
│  ├─ api/
│  │  ├─ upload/route.ts       # upload → Agent A + B
│  │  ├─ leads/route.ts        # list
│  │  ├─ leads/[id]/route.ts   # detail
│  │  └─ export.csv/route.ts   # CSV export
│  ├─ page.tsx                 # upload + list UI
│  └─ lead/[id]/page.tsx       # detail view
├─ lib/
│  ├─ ai.ts                    # Agent A/B + embeddings
│  ├─ cosine.ts                # cosine dedupe
│  └─ prisma.ts                # Prisma client
├─ prisma/
│  └─ schema.prisma
├─ public/uploads/             # uploaded images
├─ package.json
└─ AGENTS.md                   # workflow doc for Codex
```

## 🧰 License

MIT © 2025 hiddenlayer.dev