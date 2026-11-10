'use client';
// Floating chat box for the supply chain team. Sends the message to /api/chat and shows the answer.
// When the bot creates a draft item, a link to the draft is shown under the answer.
import { useState, useRef, useEffect } from 'react';

const GREEN = '#04401f';
const YELLOW = '#f5c518';
const SUGGESTIONS = ['Create a new item', 'Find the UNSPSC code for nitrile gloves', 'How many drafts are waiting?'];

const WELCOME = {
  from: 'bot',
  text: 'Describe the item you want to create (name, size, manufacturer). I will find the UNSPSC code, check for duplicates and prepare a draft. You can write in Arabic or English.'
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState([WELCOME]);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  // Keep the newest message in view and focus the input when the box opens
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [msgs, busy, open]);
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Close with the Escape key
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function ask(text) {
    const question = text.trim();
    if (!question || busy) return;
    const history = msgs.filter((m) => m !== WELCOME).slice(-12);
    setInput('');
    setBusy(true);
    setMsgs((m) => [...m, { from: 'me', text: question }]);
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, history })
      });
      const data = await r.json();
      setMsgs((m) => [...m, { from: 'bot', text: data.reply || data.error || 'No answer.', draft: data.draft }]);
    } catch {
      setMsgs((m) => [...m, { from: 'bot', text: 'Network error. Check that the server is running.' }]);
    }
    setBusy(false);
  }

  const bubble = (mine) => ({
    display: 'inline-block',
    whiteSpace: 'pre-wrap',
    padding: '8px 11px',
    borderRadius: 10,
    maxWidth: '88%',
    lineHeight: 1.45,
    fontSize: 14,
    textAlign: 'start',
    background: mine ? GREEN : '#eef1ef',
    color: mine ? '#fff' : '#17201b'
  });

  return (
    <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 50 }}>
      {open && (
        <section
          role="dialog"
          aria-label="Item creation assistant"
          style={{
            width: 'min(400px, calc(100vw - 40px))',
            height: 'min(560px, calc(100vh - 110px))',
            background: '#fff',
            border: '1px solid #d6dcd8',
            borderRadius: 14,
            boxShadow: '0 12px 36px rgba(0,0,0,.22)',
            display: 'flex',
            flexDirection: 'column',
            marginBottom: 12,
            overflow: 'hidden'
          }}
        >
          <header style={{ background: GREEN, color: '#fff', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative', width: 34, height: 34 }}>
                <img
                  src="/chatbot.jpg"
                  alt="AI Assistant"
                  style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fff', display: 'block' }}
                />
                <span style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: '50%', background: '#22c55e', border: '2px solid #04401f' }} />
              </div>
              <div>
                <strong style={{ fontSize: 15, display: 'block', lineHeight: 1.2 }}>Item creation assistant</strong>
                <span style={{ fontSize: 11, opacity: 0.85, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                  Online · UNSPSC v26.0801
                </span>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              style={{ background: 'none', border: 0, color: '#fff', fontSize: 24, lineHeight: 1, cursor: 'pointer', padding: '2px 6px' }}
            >
              ×
            </button>
          </header>

          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }} aria-live="polite">
            {msgs.map((m, i) => (
              <div
                key={i}
                dir="auto"
                style={{
                  margin: '8px 0',
                  display: 'flex',
                  flexDirection: m.from === 'me' ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                  gap: 8
                }}
              >
                {m.from === 'bot' && (
                  <img
                    src="/chatbot.jpg"
                    alt="Bot"
                    style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, marginTop: 2, border: '1px solid #d6dcd8' }}
                  />
                )}
                <div style={{ maxWidth: '88%' }}>
                  <span style={bubble(m.from === 'me')}>{m.text}</span>
                  {m.draft && (
                    <a
                      href={`/items/${m.draft.id}`}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8, padding: '8px 12px', border: '1px solid #bbf7d0', background: '#f0fdf4', borderRadius: 8, color: '#166534', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}
                    >
                      <span>✓ Draft {m.draft.ref} created</span>
                      <span>Open →</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' }}>
                <img
                  src="/chatbot.jpg"
                  alt="Bot"
                  style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                />
                <span style={{ color: '#6b766f', fontSize: 13, background: '#eef1ef', padding: '6px 12px', borderRadius: 10 }}>
                  Searching UNSPSC and the item master…
                </span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {msgs.length === 1 && (
            <div style={{ padding: '0 12px 8px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    style={{ border: `1px solid ${GREEN}`, background: '#fff', color: GREEN, borderRadius: 999, padding: '4px 10px', fontSize: 13, cursor: 'pointer' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            style={{ display: 'flex', gap: 6, padding: 10, borderTop: '1px solid #e3e8e5' }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe the item"
              aria-label="Your message"
              dir="auto"
              maxLength={500}
              style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid #c3ccc6', fontSize: 14 }}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              style={{ background: YELLOW, color: '#1b1b1b', border: 0, borderRadius: 8, padding: '8px 14px', fontWeight: 600, cursor: busy ? 'default' : 'pointer', opacity: busy || !input.trim() ? 0.55 : 1 }}
            >
              Send
            </button>
          </form>
        </section>
      )}

      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={open ? 'Close chat' : 'Open item creation assistant'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginInlineStart: 'auto',
          background: GREEN,
          color: '#fff',
          border: `2px solid ${YELLOW}`,
          borderRadius: 999,
          padding: open ? '8px 16px' : '5px 16px 5px 6px',
          fontWeight: 600,
          fontSize: 14,
          cursor: 'pointer',
          boxShadow: '0 6px 20px rgba(0,0,0,.25)',
          transition: 'all .2s ease'
        }}
      >
        <div style={{ position: 'relative', width: 42, height: 42, borderRadius: '50%', overflow: 'hidden', border: '2px solid #fff', flexShrink: 0, background: '#fff' }}>
          <img src="/chatbot.jpg" alt="AI Assistant" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <span style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: '#22c55e', border: '1.5px solid #fff' }} />
        </div>
        <span style={{ paddingInlineEnd: 4, letterSpacing: '0.2px' }}>
          {open ? 'Close' : 'Create item with AI'}
        </span>
      </button>
    </div>
  );
}
