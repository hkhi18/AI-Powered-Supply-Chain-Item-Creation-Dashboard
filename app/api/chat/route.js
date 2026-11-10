// Website chat endpoint. The assistant can search UNSPSC, check duplicates and create DRAFT items only.
import { NextResponse } from 'next/server';
import { askGemini } from '@/lib/gemini';
import { audit } from '@/lib/audit';

export const maxDuration = 30;

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const text = String(body.message || '').trim().slice(0, 500);
  if (!text) return NextResponse.json({ error: 'Empty message' }, { status: 400 });

  try {
    const { reply, draft } = await askGemini(text, body.history);
    await audit('web-chat', 'chat_message', 'chatbot', text);
    return NextResponse.json({ reply, draft });
  } catch (err) {
    console.error(err);
    const msg = String(err.message);
    const reply = msg.includes('GEMINI_API_KEY')
      ? 'The assistant is not configured yet: add GEMINI_API_KEY to .env.local and restart the website.'
      : msg.includes('Gemini 429')
        ? 'The free Gemini quota is used up for now. Try again in a minute.'
        : 'The assistant is unavailable right now. Check the server log for details.';
    return NextResponse.json({ reply }, { status: 502 });
  }
}
