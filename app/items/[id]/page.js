// Item detail ( /items/[id] ): full record, UNSPSC hierarchy and the approve / reject form.
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import Pill from '@/components/Pill';
import Explain from '@/components/Explain';
import { getItem } from '@/lib/queries';
import { findSimilarItems } from '@/lib/items';
import { reviewItemAction } from '../actions';

export default async function ItemPage({ params, searchParams }) {
  await connection();
  const { id } = await params;
  const sp = await searchParams;
  const itemId = Number(id);
  if (!Number.isInteger(itemId)) notFound();
  const item = await getItem(itemId);
  if (!item) notFound();

  // Other items that look like this one (the draft itself is excluded)
  const similar = (await findSimilarItems({ description: item.description, partNumber: item.part_number, manufacturer: item.manufacturer }))
    .filter((s) => s.id !== item.id);

  return (
    <main className="container section">
      <p style={{ margin: 0 }}><Link href="/items">← All items</Link></p>
      <h1 className="page-title" style={{ marginTop: 8 }}>{item.ref}</h1>
      <p className="lead" style={{ marginTop: 4 }}>{item.description}</p>

      {sp.created && <div className="notice ok">Draft created. A reviewer must approve it before it is used.</div>}
      {sp.done && <div className="notice ok">Item {sp.done}.</div>}
      {sp.err && <div className="notice err">{sp.err}</div>}

      <div className="grid-2">
        <div className="card">
          <div className="card-head"><div><h2>Record</h2></div><Pill value={item.status} /></div>
          <div className="card-body kv">
            <div className="k">Description</div><div className="v"><b>{item.description}</b></div>
            <div className="k">Unit of measure</div><div className="v">{item.uom}</div>
            <div className="k">Manufacturer</div><div className="v">{item.manufacturer || '—'}</div>
            <div className="k">Part number</div><div className="v">{item.part_number || '—'}</div>
            <div className="k">ERP item number</div><div className="v">{item.erp_item_no || '—'}</div>
            <div className="k">Note</div><div className="v">{item.notes || '—'}</div>
            <div className="k">Created</div><div className="v">{item.created} · {item.created_by} · <Pill value={item.source} label={item.source} /></div>
            {item.reviewed && (<><div className="k">Reviewed</div><div className="v">{item.reviewed} · {item.reviewed_by}{item.review_note ? ` · “${item.review_note}”` : ''}</div></>)}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><div><h2>UNSPSC classification</h2><p>United Nations Standard Products and Services Code v26.0801</p></div></div>
          <div className="card-body">
            <div><span className="code-chip">{item.unspsc_code}</span> <b>{item.unspsc_title}</b></div>
            {item.unspsc_definition && <p style={{ color: 'var(--ink-2)', fontSize: 14 }}>{item.unspsc_definition}</p>}
            <table className="calc"><tbody>
              <tr><td>Segment</td><td><span className="code-chip">{item.segment_code}</span> {item.segment_title}</td></tr>
              <tr><td>Family</td><td><span className="code-chip">{item.family_code}</span> {item.family_title}</td></tr>
              <tr><td>Class</td><td><span className="code-chip">{item.class_code}</span> {item.class_title}</td></tr>
              <tr className="total"><td>Commodity</td><td><span className="code-chip">{item.unspsc_code}</span> {item.unspsc_title}</td></tr>
            </tbody></table>
          </div>
        </div>
      </div>

      {similar.length > 0 && (
        <div className="banner" style={{ marginTop: 20 }}>
          ⚠&nbsp; <strong>Similar items already exist:</strong>{' '}
          {similar.map((s, i) => (
            <span key={s.id}>{i > 0 && ' · '}<Link href={`/items/${s.id}`}>{s.ref}</Link> ({Math.round(s.similarity * 100)}%, {s.reason})</span>
          ))}
        </div>
      )}

      {item.status === 'draft' && (
        <form action={reviewItemAction} className="card" style={{ marginTop: 20 }}>
          <input type="hidden" name="id" value={item.id} />
          <div className="card-head"><div><h2>Review</h2><p>Check the description, the UNSPSC code and the unit. Approving needs your name.</p></div></div>
          <div className="card-body">
            <div className="form-grid">
              <label>Reviewer *<input name="reviewer" required maxLength={60} placeholder="Your name" /></label>
              <label>ERP item number (on approval)<input name="erp_item_no" maxLength={30} placeholder="e.g. 310458109" /></label>
              <label>Note (required to reject)<input name="note" maxLength={500} /></label>
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
              <button className="btn primary" name="decision" value="approve">Approve</button>
              <button className="btn danger" name="decision" value="reject">Reject</button>
            </div>
          </div>
        </form>
      )}

      <Explain
        concepts={['Dynamic route [id]', 'await params', 'notFound()', 'Server Action', 'UPDATE … WHERE status = draft', 'Audit log']}
        en={<>
          <h4>Why a human approves</h4>
          <p>The chatbot and the form can only create <b>drafts</b>. Approving or rejecting is a separate Server Action that only works on drafts and records
            the reviewer name and time in the audit log. The UNSPSC code was checked against the loaded taxonomy when the draft was saved, so a code that does not
            exist can never reach this page.</p>
        </>}
        ar={<>
          <h4>لماذا يعتمد الصنف شخص؟</h4>
          <p>الشات بوت والنموذج يستطيعان إنشاء <b>مسودات</b> فقط. الاعتماد أو الرفض إجراء منفصل على السيرفر يعمل على المسودات فقط ويسجّل اسم المراجع والوقت في سجل التدقيق.
            رمز UNSPSC يُفحص مقابل القائمة المحمّلة عند الحفظ، لذلك لا يمكن أن يصل رمز غير موجود إلى هذه الصفحة.</p>
        </>}
      />
    </main>
  );
}
