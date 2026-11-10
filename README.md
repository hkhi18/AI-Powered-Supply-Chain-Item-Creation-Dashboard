# SCM Item Creation · إنشاء الأصناف بالذكاء الاصطناعي

Dashboard + AI chatbot for creating item-master records classified with **UNSPSC v26.0801**.
Same stack, CSS and chatbot design as *Smart Medicine Inventory* (Next.js 16, PostgreSQL/PGlite, floating ChatWidget, Gemini tool-calling).

## Run · التشغيل
1. Copy `.env.example` to `.env.local` and paste your `GEMINI_API_KEY`.
2. Double-click `1-Setup-Database.bat` once (npm install + loads 71,924 UNSPSC goods codes).
3. Double-click `2-Start-Website.bat` → http://localhost:3002

Development: `npm install` · `npm run seed` · `npm run dev`

## How the chatbot works · كيف يعمل المساعد
`app/api/chat` → `lib/gemini.js` (tool-calling loop) → `lib/chatTools.js`
| Tool | What it does |
|---|---|
| `search_unspsc` | SQL word-match over the UNSPSC table; the model never invents codes |
| `find_similar_items` | duplicate check (Jaccard on description, exact part number) |
| `create_item_draft` | validates code, UOM and duplicates, then inserts a **draft** |
| `get_summary` | counts for the dashboard |

The assistant can only create drafts. Approve / reject is a human action on `/items/[id]` and is written to `audit_log`.

## Pages · الصفحات
`/` dashboard · `/items` list + Excel export · `/items/[id]` detail + review · `/new` manual form with UNSPSC picker

## Data
`data/unspsc.csv.gz` = goods commodities (segments 10–60) from `unspsc-english-v260801`, 71,924 rows. Services segments (70+) are left out on purpose.
Two example items (nasogastric tubes) come from the KFSHRC item sample. Everything else is created by users.

## Not included yet
Login / roles (the original app has them), Oracle ERP push, UNSPSC browser page.
