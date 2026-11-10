// Seed script: builds the database from scratch.
//   node scripts/seed.mjs
// Steps: schema -> UNSPSC goods commodities (data/unspsc.csv.gz) -> two example items.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------- Connection ----------
async function connect() {
  if (process.env.DATABASE_URL) {
    const pg = await import('pg');
    const client = new pg.default.Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    return {
      query: async (s, p = []) => (await client.query(s, p)).rows,
      exec: async (s) => { await client.query(s); },
      close: () => client.end(),
      mode: 'PostgreSQL server'
    };
  }
  const { PGlite } = await import('@electric-sql/pglite');
  const dir = process.env.PGLITE_DIR || path.join(ROOT, 'pgdata');
  fs.rmSync(dir, { recursive: true, force: true });
  const db = await PGlite.create(dir);
  return {
    query: async (s, p = []) => (await db.query(s, p)).rows,
    exec: async (s) => { await db.exec(s); },
    close: () => db.close(),
    mode: `embedded PostgreSQL (PGlite) in ${dir}`
  };
}

// ---------- Minimal CSV parser (handles quoted fields and commas inside quotes) ----------
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const db = await connect();
console.log('Database:', db.mode);

console.log('1/3 Creating tables...');
await db.exec(fs.readFileSync(path.join(ROOT, 'db', 'schema.sql'), 'utf8'));

console.log('2/3 Loading UNSPSC commodities...');
const csv = zlib.gunzipSync(fs.readFileSync(path.join(ROOT, 'data', 'unspsc.csv.gz'))).toString('utf8');
const [header, ...rows] = parseCsv(csv).filter((r) => r.length > 1);
console.log('   columns:', header.join(', '), '| rows:', rows.length);

const BATCH = 500;
for (let i = 0; i < rows.length; i += BATCH) {
  const chunk = rows.slice(i, i + BATCH);
  const params = [];
  const values = chunk.map((r, k) => {
    const [code, title, definition, classCode, classTitle, familyCode, familyTitle, segCode, segTitle] = r;
    const titleLc = title.toLowerCase();
    const searchLc = `${title} ${classTitle} ${familyTitle}`.toLowerCase();
    params.push(code, title, definition || null, classCode, classTitle, familyCode, familyTitle, segCode, segTitle, titleLc, searchLc);
    const b = k * 11;
    return `(${Array.from({ length: 11 }, (_, j) => `$${b + j + 1}`).join(',')})`;
  });
  await db.query(
    `INSERT INTO unspsc (code, title, definition, class_code, class_title, family_code, family_title, segment_code, segment_title, title_lc, search_lc) VALUES ${values.join(',')}`,
    params
  );
  if ((i / BATCH) % 40 === 0) console.log(`   ${Math.min(i + BATCH, rows.length)} / ${rows.length}`);
}

console.log('3/3 Adding example items (from the KFSHRC item sample)...');
// Both example items are nasogastric feeding tubes -> UNSPSC 42231701
await db.query(
  `INSERT INTO items (description, unspsc_code, uom, manufacturer, part_number, status, source, created_by, reviewed_by, reviewed_at, erp_item_no)
   VALUES ($1, 42231701, 'each', $2, $3, 'approved', 'seed', 'seed', 'seed', now(), $4),
          ($5, 42231701, 'each', NULL, NULL, 'approved', 'seed', 'seed', 'seed', now(), $6)`,
  ['TUBE FEEDING NASOGASTRIC WITH STYLET 10FR X 140CM', 'AVANOS MEDICAL', '42-9551', '310458108',
   'TUBE FEEDING NASOGASTRIC WITH STYLET 5FR X 56CM', '310458100']
);
await db.query(`INSERT INTO audit_log (actor, action, entity, details) VALUES ('seed', 'seed_database', 'database', $1)`, [
  `Loaded ${rows.length} UNSPSC commodities and 2 example items`
]);

const check = await db.query('SELECT (SELECT COUNT(*) FROM unspsc)::int AS unspsc, (SELECT COUNT(*) FROM items)::int AS items');
console.log('Done:', check[0]);
await db.close();
