// UNSPSC search. Used by the chatbot tool, the /new form picker and the item validation.
// The search is plain SQL (word-start regex per word) - no AI is involved in picking candidates.
import { query, one } from './db.js';

// Words that carry no product meaning
const STOP = new Set([
  'the', 'and', 'for', 'with', 'without', 'from', 'type', 'size', 'each', 'item', 'items', 'new', 'use', 'used',
  'pcs', 'piece', 'pieces', 'box', 'pack', 'per', 'set', 'sterile', 'disposable', 'single', 'x'
]);

// Hospital supply segments get a small boost so medical items rank first
const MEDICAL_SEGMENTS = [42000000, 51000000, 41000000];

// Turn free text into search words: lower-case letters only, plural 's' removed
export function searchWords(text) {
  const words = String(text || '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 3 && !STOP.has(w))
    .map((w) => (w.length > 4 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w));
  return [...new Set(words)].slice(0, 8);
}

const COLS = 'code, title, definition, class_code, class_title, family_code, family_title, segment_code, segment_title';

// Returns the best matching commodities, best first.
// Score: 3 points per word found in the commodity title, 1 point per word found in class/family title,
// +4 if the whole phrase is in the title, +0.5 for medical segments.
export async function searchUnspsc(text, { limit = 10, segment = null } = {}) {
  const words = searchWords(text);
  if (words.length === 0) return [];
  const params = [];
  const p = (v) => { params.push(v); return `$${params.length}`; };

  const parts = words.map((w) => {
    const ph = p(`(^|[^a-z-])${w}`);
    return `(CASE WHEN title_lc ~ ${ph} THEN 3 ELSE 0 END + CASE WHEN search_lc ~ ${ph} THEN 1 ELSE 0 END)`;
  });
  const phrase = p(`%${words.join(' ')}%`);
  const anyMatch = words.map((w) => `search_lc ~ ${p(`(^|[^a-z-])${w}`)}`).join(' OR ');
  const medical = p(MEDICAL_SEGMENTS);
  const segFilter = segment ? `AND segment_code = ${p(Number(segment))}` : '';
  const lim = p(Math.min(Math.max(Number(limit) || 10, 1), 25));

  const rows = await query(
    `SELECT ${COLS},
            (${parts.join(' + ')} + CASE WHEN title_lc LIKE ${phrase} THEN 4 ELSE 0 END
             + CASE WHEN segment_code = ANY(${medical}::bigint[]) THEN 0.5 ELSE 0 END)::float8 AS score
       FROM unspsc
      WHERE (${anyMatch}) ${segFilter}
      ORDER BY score DESC, length(title) ASC
      LIMIT ${lim}`,
    params
  );
  return rows.map(shape);
}

export async function getUnspsc(code) {
  const n = Number(code);
  if (!Number.isInteger(n)) return null;
  const row = await one(`SELECT ${COLS} FROM unspsc WHERE code = $1`, [n]);
  return row ? shape(row) : null;
}

// BIGINT columns arrive as strings or BigInt depending on the driver - plain numbers for JSON
function shape(r) {
  return {
    code: Number(r.code),
    title: r.title,
    definition: r.definition || null,
    class: { code: Number(r.class_code), title: r.class_title },
    family: { code: Number(r.family_code), title: r.family_title },
    segment: { code: Number(r.segment_code), title: r.segment_title },
    ...(r.score !== undefined ? { score: Math.round(Number(r.score) * 10) / 10 } : {})
  };
}
