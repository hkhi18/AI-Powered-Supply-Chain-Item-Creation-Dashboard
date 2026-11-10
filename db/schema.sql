-- SCM Item Creation - PostgreSQL schema
DROP TABLE IF EXISTS audit_log, items, unspsc CASCADE;

-- UNSPSC v26.0801 commodities (goods only, segments 10-60). Loaded by scripts/seed.mjs
CREATE TABLE unspsc (
  code          BIGINT PRIMARY KEY,        -- 8-digit commodity code, e.g. 42231701
  title         TEXT NOT NULL,            -- Nasogastric tubes
  definition    TEXT,
  class_code    BIGINT NOT NULL,
  class_title   TEXT NOT NULL,
  family_code   BIGINT NOT NULL,
  family_title  TEXT NOT NULL,
  segment_code  BIGINT NOT NULL,
  segment_title TEXT NOT NULL,
  title_lc      TEXT NOT NULL,            -- lower-case copies used by the search query
  search_lc     TEXT NOT NULL             -- title + class + family, lower-case
);
CREATE INDEX unspsc_segment_idx ON unspsc (segment_code);

-- Item master records. The chatbot and the form only ever create status = 'draft'.
CREATE TABLE items (
  id           SERIAL PRIMARY KEY,
  ref          TEXT GENERATED ALWAYS AS ('ITM-' || lpad(id::text, 5, '0')) STORED,
  description  TEXT NOT NULL,             -- standard name: NOUN FIRST, UPPER CASE, size at the end
  unspsc_code  BIGINT NOT NULL REFERENCES unspsc(code),
  uom          TEXT NOT NULL,             -- each, box, pack ...
  manufacturer TEXT,
  part_number  TEXT,
  notes        TEXT,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected')),
  source       TEXT NOT NULL DEFAULT 'form' CHECK (source IN ('form', 'chatbot', 'seed')),
  created_by   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by  TEXT,
  reviewed_at  TIMESTAMPTZ,
  review_note  TEXT,
  erp_item_no  TEXT                       -- Oracle item number, entered when approved
);
CREATE INDEX items_status_idx ON items (status);
CREATE INDEX items_unspsc_idx ON items (unspsc_code);

CREATE TABLE audit_log (
  id      SERIAL PRIMARY KEY,
  at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor   TEXT NOT NULL,
  action  TEXT NOT NULL,
  entity  TEXT,
  details TEXT
);
