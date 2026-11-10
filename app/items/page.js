// Items list ( /items ): filter by status, search by text, paginate.
import Link from 'next/link';
import { connection } from 'next/server';
import Pill from '@/components/Pill';
import Explain from '@/components/Explain';
import { getItems, getStatusCounts, STATUSES } from '@/lib/queries';

export const metadata = { title: 'Items · SCM Item Creation' };
const PAGE_SIZE = 25;

export default async function ItemsPage({ searchParams }) {
  await connection();
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status) ? sp.status : '';
  const q = String(sp.q || '').trim().slice(0, 80);
  const page = Math.max(1, Number(sp.page) || 1);

  const [{ rows, total }, counts] = await Promise.all([
    getItems({ status, q, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    getStatusCounts()
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const all = Object.values(counts).reduce((a, b) => a + b, 0);
  const href = (s, p = 1) => `/items?${new URLSearchParams({ ...(s ? { status: s } : {}), ...(q ? { q } : {}), ...(p > 1 ? { page: p } : {}) })}`;

  return (
    <main className="container section">
      <h1 className="page-title">Items</h1>
      <p className="lead">Drafts come first. Open a draft to check the UNSPSC classification and approve or reject it.</p>

      <div className="filters" style={{ marginBottom: 16 }}>
        <div className="tabs">
          <Link href={href('')} className={!status ? 'on' : ''}>All ({all})</Link>
          {STATUSES.map((s) => <Link key={s} href={href(s)} className={s === status ? 'on' : ''}>{s} ({counts[s] || 0})</Link>)}
        </div>
        <form method="get" action="/items" style={{ display: 'flex', gap: 8, marginInlineStart: 'auto' }}>
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder="Search description, part no, UNSPSC…" style={{ width: 280 }} />
          <button className="btn">Search</button>
        </form>
        <a className="btn" href={`/api/export${status ? `?status=${status}` : ''}`}>Export to Excel</a>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Ref</th><th>Description</th><th>UNSPSC</th><th>UOM</th><th>Status</th><th>Source</th><th>Created</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><Link href={`/items/${r.id}`} className="med-name">{r.ref}</Link></td>
                  <td style={{ maxWidth: 380 }}>
                    <Link href={`/items/${r.id}`} className="med-name">{r.description}</Link>
                    {(r.manufacturer || r.part_number) && <div className="med-meta">{[r.manufacturer, r.part_number].filter(Boolean).join(' · ')}</div>}
                  </td>
                  <td><span className="code-chip">{r.unspsc_code}</span><div className="med-meta">{r.unspsc_title}</div></td>
                  <td>{r.uom}</td>
                  <td><Pill value={r.status} /></td>
                  <td><Pill value={r.source} label={r.source} /></td>
                  <td style={{ whiteSpace: 'nowrap' }}>{r.created}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7}>No items found.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="pager">
          <span>Page {page} of {pages} · {total} item(s)</span>
          {page > 1 && <Link className="btn sm" href={href(status, page - 1)}>← Previous</Link>}
          {page < pages && <Link className="btn sm" href={href(status, page + 1)}>Next →</Link>}
        </div>
      </div>

      <Explain
        concepts={['Server Component', 'searchParams', 'SQL ORDER BY (status = draft) DESC', 'Route Handler /api/export', 'xlsx']}
        en={<>
          <h4>What you see</h4>
          <p>Every item in the master with its UNSPSC commodity. Drafts are listed first so reviewers see the open work. <b>Export to Excel</b> downloads the
            current filter as a spreadsheet (item ref, ERP number, description, UNSPSC code and hierarchy, UOM, manufacturer, part number).</p>
        </>}
        ar={<>
          <h4>ماذا ترى؟</h4>
          <p>كل الأصناف في الـ item master مع رمز UNSPSC. المسودات تظهر أولاً ليرى المراجع العمل المفتوح. زر <b>Export to Excel</b> يحمّل الفلتر الحالي
            كملف Excel (رقم الصنف، رقم النظام، الوصف، رمز UNSPSC وتصنيفه، الوحدة، المصنّع، رقم القطعة).</p>
        </>}
      />
    </main>
  );
}
