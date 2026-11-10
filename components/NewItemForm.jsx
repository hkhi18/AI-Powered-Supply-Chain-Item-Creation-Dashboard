'use client';
// Client Component: the manual "New item" form. useActionState keeps what the user typed when the
// server rejects the input (missing code, duplicate...).
import { useActionState } from 'react';
import Link from 'next/link';
import UnspscPicker from './UnspscPicker';
import { createItemAction } from '@/app/items/actions';

export default function NewItemForm({ uoms }) {
  const [state, action, pending] = useActionState(createItemAction, { values: {} });
  const v = state.values || {};
  return (
    <form action={action} className="card">
      <div className="card-head">
        <div>
          <h2>Item details</h2>
          <p>Description format: noun first, upper case, size at the end. Example: TUBE FEEDING NASOGASTRIC WITH STYLET 10FR X 140CM</p>
        </div>
      </div>
      <div className="card-body">
        {state.error && (
          <div className="notice err">
            {state.error}
            {state.duplicates?.length > 0 && (
              <ul style={{ margin: '8px 0 0', paddingInlineStart: 18 }}>
                {state.duplicates.map((d) => (
                  <li key={d.id}>
                    <Link href={`/items/${d.id}`}>{d.ref}</Link> · {d.description} · {Math.round(d.similarity * 100)}% similar ({d.reason})
                  </li>
                ))}
              </ul>
            )}
            {state.duplicates?.some((d) => d.similarity >= 0.8) && (
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, fontSize: 14 }}>
                <input type="checkbox" name="allow_duplicate" /> It is a different item, create it anyway
              </label>
            )}
          </div>
        )}
        <div className="form-grid two">
          <label className="wide">Description *
            <input name="description" defaultValue={v.description || ''} required minLength={5} maxLength={150} placeholder="TUBE FEEDING NASOGASTRIC WITH STYLET 10FR X 140CM" />
          </label>
          <div className="wide" style={{ display: 'grid', gap: 4 }}>
            <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>UNSPSC code *</span>
            <UnspscPicker />
          </div>
          <label>Unit of measure *
            <select name="uom" defaultValue={v.uom || 'each'} required>
              {uoms.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </label>
          <label>Created by *
            <input name="created_by" defaultValue={v.created_by || ''} required maxLength={60} placeholder="Your name" />
          </label>
          <label>Manufacturer
            <input name="manufacturer" defaultValue={v.manufacturer || ''} maxLength={80} />
          </label>
          <label>Manufacturer part number
            <input name="part_number" defaultValue={v.part_number || ''} maxLength={60} />
          </label>
          <label className="wide">Note for the reviewer
            <textarea name="notes" rows={2} defaultValue={v.notes || ''} maxLength={500} />
          </label>
        </div>
        <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
          <button className="btn primary" disabled={pending}>{pending ? 'Saving…' : 'Save as draft'}</button>
          <Link className="btn" href="/items">Cancel</Link>
        </div>
      </div>
    </form>
  );
}
