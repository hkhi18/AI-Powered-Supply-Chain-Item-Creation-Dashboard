// Dashboard page ( / ). Server Component: queries PostgreSQL on the server, sends HTML to the browser.
import Link from 'next/link';
import { connection } from 'next/server';
import Explain from '@/components/Explain';
import Pill from '@/components/Pill';
import SegmentChart from '@/components/SegmentChart';
import { getKpis, getSegmentCounts, getItems, getRecentActivity } from '@/lib/queries';
import { fmtInt } from '@/lib/format';

export default async function DashboardPage() {
  await connection();   // render at request time (fresh data, never prerendered at build)
  const [kpi, segments, recent, activity] = await Promise.all([
    getKpis(), getSegmentCounts(), getItems({ limit: 8 }), getRecentActivity(8)
  ]);

  return (
    <main>
      <section className="hero compact">
        <div className="container">
          <h1>Create standard items, classified in seconds</h1>
          <p>Describe an item in Arabic or English. The assistant finds the UNSPSC code, checks for duplicates and prepares a draft
            that a reviewer approves — every code comes from the UNSPSC v26.0801 list, never from the model&apos;s memory.</p>
          <div className="action-cards">
            <Link href="/items?status=draft" className="action-card">
              <span className="icon">◎</span>
              <span><span className="title">Review drafts <span>→</span></span><span className="sub">{fmtInt(kpi.drafts)} waiting for approval</span></span>
            </Link>
            <Link href="/new" className="action-card">
              <span className="icon">✚</span>
              <span><span className="title">New item (form) <span>→</span></span><span className="sub">Or use the assistant, bottom right</span></span>
            </Link>
            <a href="/api/export?status=approved" className="action-card">
              <span className="icon">⇩</span>
              <span><span className="title">Export approved <span>→</span></span><span className="sub">Excel with UNSPSC hierarchy</span></span>
            </a>
          </div>
        </div>
      </section>

      <div className="container">
        <section className="section">
          <h1 className="page-title">Item creation dashboard</h1>
          <p className="lead">Every number below is computed from PostgreSQL. Drafts stay drafts until a person approves them.</p>

          <div className="kpis">
            <div className="kpi"><div className="label">Items in master</div><div className="value">{fmtInt(kpi.total)}</div><div className="sub">{fmtInt(kpi.rejected)} rejected</div></div>
            <div className="kpi amber"><div className="label">Drafts to review</div><div className="value">{fmtInt(kpi.drafts)}</div><div className="sub">waiting for approval</div></div>
            <div className="kpi"><div className="label">Approved</div><div className="value">{fmtInt(kpi.approved)}</div><div className="sub">ready for the ERP</div></div>
            <div className="kpi"><div className="label">Created by assistant</div><div className="value">{fmtInt(kpi.by_chatbot)}</div><div className="sub">of {fmtInt(kpi.total)} items</div></div>
            <div className="kpi"><div className="label">UNSPSC codes</div><div className="value">{fmtInt(kpi.unspsc_codes)}</div><div className="sub">goods commodities, v26.0801</div></div>
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="card-head"><div><h2>Items by UNSPSC segment</h2><p>Drafts and approved items (rejected are not counted)</p></div></div>
              <div className="card-body">
                {segments.length ? <SegmentChart rows={segments} /> : <p>No items yet.</p>}
              </div>
            </div>
            <div className="card">
              <div className="card-head"><div><h2>Recent activity</h2><p>Last actions in the audit log</p></div></div>
              <div className="card-body">
                <ul className="timeline">
                  {activity.map((a, i) => (
                    <li key={i}><b>{a.action.replace(/_/g, ' ')}</b> {a.entity && a.entity !== 'database' ? `· ${a.entity}` : ''}
                      <div className="med-meta">{a.at} · {a.actor}</div></li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 20 }}>
            <div className="card-head">
              <div><h2>Latest items</h2><p>Drafts first, then newest.</p></div>
              <Link className="btn" href="/items">All items →</Link>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Ref</th><th>Description</th><th>UNSPSC</th><th>UOM</th><th>Status</th><th>Created</th></tr></thead>
                <tbody>
                  {recent.rows.map((r) => (
                    <tr key={r.id}>
                      <td><Link href={`/items/${r.id}`} className="med-name">{r.ref}</Link></td>
                      <td style={{ maxWidth: 380 }}>{r.description}</td>
                      <td><span className="code-chip">{r.unspsc_code}</span><div className="med-meta">{r.unspsc_title}</div></td>
                      <td>{r.uom}</td>
                      <td><Pill value={r.status} /></td>
                      <td style={{ whiteSpace: 'nowrap' }}>{r.created}</td>
                    </tr>
                  ))}
                  {recent.rows.length === 0 && <tr><td colSpan={6}>No items yet. Open the assistant and describe your first item.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <Explain
          concepts={['Server Component', 'connection()', 'Promise.all', 'Client Component (chart, chat)', 'Gemini function calling', 'Route Handler /api/chat', 'SQL FILTER (WHERE …)', 'Foreign key to unspsc']}
          en={<>
            <h4>How the assistant creates an item</h4>
            <ul>
              <li>You write the item in natural language. The browser sends it to <code>/api/chat</code>.</li>
              <li>Gemini may call four tools: <code>search_unspsc</code>, <code>find_similar_items</code>, <code>create_item_draft</code> and <code>get_summary</code>.
                The model never writes SQL: it only chooses a tool and its arguments (<code>lib/chatTools.js</code>).</li>
              <li><code>search_unspsc</code> ranks the 71,924 goods commodities with a SQL word match. <code>create_item_draft</code> rejects any code that is not in the table,
                and refuses a near-identical item unless you confirm it is different.</li>
              <li>The assistant can only create <b>drafts</b>. Approval is a button on the item page.</li>
            </ul>
          </>}
          ar={<>
            <h4>كيف ينشئ المساعد صنفاً؟</h4>
            <ul>
              <li>تكتب وصف الصنف بلغتك الطبيعية، ويرسله المتصفح إلى <code>/api/chat</code>.</li>
              <li>يستطيع Gemini استدعاء أربع أدوات: <code>search_unspsc</code> و<code>find_similar_items</code> و<code>create_item_draft</code> و<code>get_summary</code>.
                النموذج لا يكتب SQL أبداً، بل يختار الأداة ومعطياتها فقط (<code>lib/chatTools.js</code>).</li>
              <li>أداة <code>search_unspsc</code> ترتّب 71,924 رمز سلع بمطابقة الكلمات في SQL. وأداة <code>create_item_draft</code> ترفض أي رمز غير موجود في الجدول،
                وترفض الصنف المتطابق تقريباً إلا إذا أكدت أنه مختلف.</li>
              <li>المساعد ينشئ <b>مسودات</b> فقط، والاعتماد زر في صفحة الصنف.</li>
            </ul>
          </>}
        />
      </div>
    </main>
  );
}
