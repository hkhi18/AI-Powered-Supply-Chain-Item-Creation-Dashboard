# AI-Powered Supply Chain Item Creation Dashboard

**لوحة إنشاء الأصناف بالذكاء الاصطناعي لإدارة سلاسل الإمداد**

A web dashboard with an AI chatbot that helps supply chain teams create standardized item master records. Users describe an item in natural language, and the assistant classifies it with the **UNSPSC v26.0801** taxonomy, checks for duplicates, and saves a structured **draft** for human review.

Built for the Supply Chain and Data Analytics team at **King Faisal Specialist Hospital & Research Centre (KFSHRC)**.

---

## Why this project

Item master data is only useful when it is consistent. Free-text descriptions, missing category codes and duplicate records slow down procurement and inventory work. This project addresses that by:

- Classifying every item with a standard **UNSPSC** commodity code
- Detecting likely duplicates before a record is created
- Keeping a human in the loop: the AI can only create drafts, and approval is a manual action
- Recording every review decision in an audit log

## Features

| Feature | Description |
|---|---|
| AI chatbot | Floating chat widget that turns a plain-language item description into a structured draft |
| UNSPSC classification | 71,924 goods commodity codes (segments 10-60) searchable by the assistant and by a manual picker |
| Duplicate detection | Jaccard similarity on descriptions plus exact part-number matching |
| Validation | Checks the UNSPSC code, unit of measure and duplicates before inserting |
| Review workflow | Approve or reject items on the detail page; every decision is written to `audit_log` |
| Dashboard | Item counts and UNSPSC segment charts (Plotly) |
| Excel export | Export the item list from `/items` |
| Bilingual UI | English and Arabic labels |

## Tech stack

- **Framework:** Next.js 16 (App Router), React
- **Database:** PostgreSQL / PGlite
- **AI:** Google Gemini with tool calling
- **Charts:** Plotly
- **Taxonomy:** UNSPSC v26.0801 (goods, segments 10-60)

## How the chatbot works

```
User message
    |
app/api/chat  ->  lib/gemini.js (tool-calling loop)  ->  lib/chatTools.js
```

The model never invents codes. It can only call these tools:

| Tool | Purpose |
|---|---|
| `search_unspsc` | SQL word-match over the UNSPSC table |
| `find_similar_items` | Duplicate check (Jaccard on description, exact part number) |
| `create_item_draft` | Validates code, UOM and duplicates, then inserts a **draft** |
| `get_summary` | Counts for the dashboard |

## Getting started

### Prerequisites

- Node.js 18 or later
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

### Quick start on Windows

1. Copy `.env.example` to `.env.local` and set your `GEMINI_API_KEY`.
2. Run `1-Setup-Database.bat` once. It installs dependencies and loads the UNSPSC codes.
3. Run `2-Start-Website.bat` and open <http://localhost:3002>.

### Manual setup

```bash
npm install
npm run seed     # loads the UNSPSC goods codes
npm run dev      # starts the app on http://localhost:3002
```

### Environment variables

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Gemini API key used by the chatbot |
| `DATABASE_URL` | Optional PostgreSQL connection string (see `.env.example`) |

> **Security:** never commit real keys. Keep secrets in `.env.local` only, which is git-ignored. `.env.example` must contain placeholders.

## Pages

| Route | Description |
|---|---|
| `/` | Dashboard |
| `/items` | Item list with Excel export |
| `/items/[id]` | Item detail and review (approve / reject) |
| `/new` | Manual item form with UNSPSC picker |

## Project structure

```
app/
  api/chat/       chatbot endpoint
  api/export/     Excel export
  api/unspsc/     UNSPSC search
  items/          list, detail and review pages
  new/            manual creation form
components/       ChatWidget, UnspscPicker, charts, form
lib/              gemini, chatTools, db, items, queries, audit, unspsc
db/schema.sql     database schema
data/             unspsc.csv.gz (71,924 goods codes)
scripts/seed.mjs  loads UNSPSC data
```

## Data

`data/unspsc.csv.gz` contains goods commodities (segments 10-60) from `unspsc-english-v260801`. Services segments (70+) are left out on purpose. Two sample items (nasogastric tubes) come from the KFSHRC item sample; all other records are created by users.

## Roadmap

- [ ] Login and user roles
- [ ] Oracle ERP push of approved items
- [ ] UNSPSC browser page

## Author

**Hanin Alhazmi**, Supply Chain and Data Analytics volunteer at KFSHRC
GitHub: [@hkhi18](https://github.com/hkhi18)

## Acknowledgements

- [UNSPSC](https://www.unspsc.org/) for the classification standard
- Google Gemini for tool-calling LLM support
