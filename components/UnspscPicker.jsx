'use client';
// Client Component: search box for UNSPSC codes. Calls /api/unspsc?q= while the user types and
// puts the chosen 8-digit code in a hidden input so the surrounding <form> sends it.
import { useState, useEffect } from 'react';

export default function UnspscPicker({ name = 'unspsc_code', initial = null }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [chosen, setChosen] = useState(initial);

  // Debounce: wait 250 ms after the last key press before asking the server
  useEffect(() => {
    if (q.trim().length < 3) { setResults([]); return; }
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await fetch(`/api/unspsc?q=${encodeURIComponent(q)}`);
        const data = await r.json();
        setResults(data.results || []);
      } catch {
        setResults([]);
      }
      setBusy(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="picker">
      <input type="hidden" name={name} value={chosen?.code || ''} />
      {chosen && (
        <div className="picked">
          <div>
            <span className="code-chip">{chosen.code}</span> <b>{chosen.title}</b>
            <div className="crumb">{chosen.segment.title} › {chosen.family.title} › {chosen.class.title}</div>
          </div>
          <button type="button" className="btn sm" onClick={() => setChosen(null)}>Change</button>
        </div>
      )}
      {!chosen && (
        <>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search UNSPSC, e.g. nasogastric tube, nitrile gloves, syringe"
            aria-label="Search UNSPSC"
            style={{ width: '100%' }}
          />
          {busy && <div className="crumb" style={{ marginTop: 6 }}>Searching…</div>}
          {results.length > 0 && (
            <ul className="picker-list">
              {results.map((r) => (
                <li key={r.code}>
                  <button type="button" onClick={() => { setChosen(r); setResults([]); }}>
                    <span className="code-chip">{r.code}</span> <b>{r.title}</b>
                    <span className="crumb">{r.family.title} › {r.class.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!busy && q.trim().length >= 3 && results.length === 0 && <div className="crumb" style={{ marginTop: 6 }}>No match. Try another name.</div>}
        </>
      )}
    </div>
  );
}
