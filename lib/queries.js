// All read queries used by the pages. Each function = one SQL question to PostgreSQL.
import { query, one } from './db.js';

export const STATUSES = ['draft', 'approved', 'rejected'];

export async function getKpis() {
  return one(`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'draft')::int    AS drafts,
           COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
           COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
           COUNT(*) FILTER (WHERE source = 'chatbot')::int  AS by_chatbot,
           (SELECT COUNT(*) FROM unspsc)::int               AS unspsc_codes
      FROM items`);
}

// Items per UNSPSC segment (rejected items are not counted)
export async function getSegmentCounts() {
  return query(`
    SELECT u.segment_code::text AS code, u.segment_title AS title, COUNT(*)::int AS n
      FROM items i JOIN unspsc u ON u.code = i.unspsc_code
     WHERE i.status <> 'rejected'
     GROUP BY 1, 2 ORDER BY n DESC, title LIMIT 12`);
}

const LIST_COLS = `i.id, i.ref, i.description, i.uom, i.manufacturer, i.part_number, i.status, i.source,
  i.unspsc_code::text AS unspsc_code, u.title AS unspsc_title, u.segment_title,
  to_char(i.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI') AS created`;

export async function getItems({ status = '', q = '', limit = 25, offset = 0 } = {}) {
  const params = [];
  const where = [];
  if (STATUSES.includes(status)) { params.push(status); where.push(`i.status = $${params.length}`); }
  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    where.push(`(lower(i.description) LIKE $${params.length} OR lower(coalesce(i.part_number, '')) LIKE $${params.length}
                 OR lower(coalesce(i.manufacturer, '')) LIKE $${params.length} OR i.unspsc_code::text LIKE $${params.length}
                 OR lower(i.ref) LIKE $${params.length})`);
  }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  params.push(limit, offset);
  const rows = await query(
    `SELECT ${LIST_COLS} FROM items i JOIN unspsc u ON u.code = i.unspsc_code ${w}
      ORDER BY (i.status = 'draft') DESC, i.created_at DESC, i.id DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const count = await one(`SELECT COUNT(*)::int AS n FROM items i ${w}`, params.slice(0, params.length - 2));
  return { rows, total: count.n };
}

export async function getStatusCounts() {
  const rows = await query('SELECT status, COUNT(*)::int AS n FROM items GROUP BY status');
  return Object.fromEntries(rows.map((r) => [r.status, r.n]));
}

export async function getItem(id) {
  return one(
    `SELECT i.id, i.ref, i.description, i.uom, i.manufacturer, i.part_number, i.notes, i.status, i.source, i.created_by,
            i.reviewed_by, i.review_note, i.erp_item_no,
            to_char(i.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI') AS created,
            to_char(i.reviewed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI') AS reviewed,
            u.code::text AS unspsc_code, u.title AS unspsc_title, u.definition AS unspsc_definition,
            u.class_code::text AS class_code, u.class_title, u.family_code::text AS family_code, u.family_title,
            u.segment_code::text AS segment_code, u.segment_title
       FROM items i JOIN unspsc u ON u.code = i.unspsc_code WHERE i.id = $1`,
    [id]
  );
}

export async function getRecentActivity(limit = 8) {
  return query(
    `SELECT actor, action, entity, details, to_char(at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI') AS at
       FROM audit_log ORDER BY id DESC LIMIT $1`,
    [limit]
  );
}

// Rows for the Excel export: same columns as the Oracle item sample, plus the UNSPSC hierarchy
export async function getExportRows(status) {
  const params = [];
  let w = '';
  if (STATUSES.includes(status)) { params.push(status); w = 'WHERE i.status = $1'; }
  return query(
    `SELECT i.ref, i.erp_item_no, i.description, i.unspsc_code::text AS unspsc_code, u.title AS unspsc_title,
            u.segment_title, u.family_title, u.class_title, i.uom, i.manufacturer, i.part_number, i.status
       FROM items i JOIN unspsc u ON u.code = i.unspsc_code ${w} ORDER BY i.id`,
    params
  );
}
