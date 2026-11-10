// Item master logic shared by the form, the dashboard actions and the chatbot tools.
import { query, one } from './db.js';
import { getUnspsc } from './unspsc.js';
import { audit } from './audit.js';

// Units of measure (same wording as the Oracle item sample: "each")
export const UOMS = [
  'each', 'box', 'pack', 'case', 'carton', 'bottle', 'vial', 'ampoule', 'tube', 'roll', 'set', 'pair', 'kit', 'bag', 'packet',
  'kg', 'g', 'l', 'ml', 'm'
];

// Similarity thresholds for the duplicate check (0 to 1)
export const SIMILAR_AT = 0.5;  // shown to the user as "similar item exists"
export const BLOCK_AT = 0.8;    // creation is refused unless the user confirms it is not a duplicate

const DESC_STOP = new Set(['WITH', 'AND', 'FOR', 'OF', 'THE', 'X', 'A', 'IN']);

// Standard description: UPPER CASE, single spaces, "x" between sizes written as X, max 150 characters
export function normalizeDescription(text) {
  return String(text || '')
    .toUpperCase()
    .replace(/[×*]/g, ' X ')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ' ')
    .trim()
    .slice(0, 150);
}

function tokens(text) {
  return new Set(
    normalizeDescription(text)
      .split(/[^A-Z0-9.]+/)
      .filter((t) => t && !DESC_STOP.has(t))
  );
}

// Jaccard similarity: shared words / all words. Different sizes lower the score on purpose,
// so "NG TUBE 10FR" and "NG TUBE 5FR" are two items, not one.
export function similarity(a, b) {
  const A = tokens(a), B = tokens(b);
  if (A.size === 0 || B.size === 0) return 0;
  let shared = 0;
  for (const t of A) if (B.has(t)) shared++;
  return shared / (A.size + B.size - shared);
}

const ITEM_COLS = `i.id, i.ref, i.description, i.unspsc_code, i.uom, i.manufacturer, i.part_number, i.notes, i.status, i.source,
  i.created_by, i.created_at, i.reviewed_by, i.reviewed_at, i.review_note, i.erp_item_no, u.title AS unspsc_title`;

// Existing items (not rejected) that look like this one. Same manufacturer part number = certain duplicate.
export async function findSimilarItems({ description, partNumber = null, manufacturer = null, limit = 5 }) {
  const rows = await query(
    `SELECT ${ITEM_COLS} FROM items i JOIN unspsc u ON u.code = i.unspsc_code WHERE i.status <> 'rejected'`
  );
  const pn = partNumber ? String(partNumber).trim().toLowerCase() : null;
  const mf = manufacturer ? String(manufacturer).trim().toLowerCase() : null;
  return rows
    .map((r) => {
      const samePart = pn && r.part_number && String(r.part_number).trim().toLowerCase() === pn &&
        (!mf || !r.manufacturer || String(r.manufacturer).trim().toLowerCase() === mf);
      const score = samePart ? 1 : similarity(description, r.description);
      return {
        id: r.id, ref: r.ref, description: r.description, status: r.status, uom: r.uom,
        manufacturer: r.manufacturer, part_number: r.part_number,
        unspsc_code: Number(r.unspsc_code), unspsc_title: r.unspsc_title,
        similarity: Math.round(score * 100) / 100,
        reason: samePart ? 'same manufacturer part number' : 'similar description'
      };
    })
    .filter((r) => r.similarity >= SIMILAR_AT)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

// Validates and inserts a DRAFT item. Never approves. Returns { created, item?, error?, duplicates? }.
export async function createDraft(input, { source = 'form', actor = 'unknown', allowDuplicate = false } = {}) {
  const description = normalizeDescription(input.description);
  if (description.length < 5) return { created: false, error: 'Description is too short (at least 5 characters).' };

  const uom = String(input.uom || '').toLowerCase().trim();
  if (!UOMS.includes(uom)) return { created: false, error: `Unit of measure must be one of: ${UOMS.join(', ')}.` };

  // The UNSPSC code must exist in the loaded taxonomy - the AI can never invent a code
  const unspsc = await getUnspsc(input.unspsc_code);
  if (!unspsc) return { created: false, error: `UNSPSC code ${input.unspsc_code} does not exist in the UNSPSC v26.0801 goods list.` };

  const manufacturer = clean(input.manufacturer, 80);
  const partNumber = clean(input.part_number, 60);
  const notes = clean(input.notes, 500);

  const duplicates = await findSimilarItems({ description, partNumber, manufacturer });
  const blocking = duplicates.filter((d) => d.similarity >= BLOCK_AT);
  if (blocking.length > 0 && !allowDuplicate) {
    return {
      created: false,
      error: 'Possible duplicate: a very similar item already exists. Nothing was created.',
      duplicates
    };
  }

  const row = await one(
    `INSERT INTO items (description, unspsc_code, uom, manufacturer, part_number, notes, status, source, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, $8) RETURNING id, ref`,
    [description, unspsc.code, uom, manufacturer, partNumber, notes, source, actor]
  );
  await audit(actor, 'item_draft_created', row.ref, `${description} | UNSPSC ${unspsc.code} | via ${source}`);
  return {
    created: true,
    item: { id: row.id, ref: row.ref, description, uom, manufacturer, part_number: partNumber, unspsc },
    duplicates
  };
}

function clean(v, max) {
  const s = String(v ?? '').replace(/\s+/g, ' ').trim();
  return s ? s.slice(0, max) : null;
}
