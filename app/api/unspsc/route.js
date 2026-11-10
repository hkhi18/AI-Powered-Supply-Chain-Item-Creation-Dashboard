// UNSPSC search for the form picker: GET /api/unspsc?q=nasogastric+tube
import { NextResponse } from 'next/server';
import { searchUnspsc } from '@/lib/unspsc';

export async function GET(request) {
  const q = String(new URL(request.url).searchParams.get('q') || '').slice(0, 100);
  const results = await searchUnspsc(q, { limit: 10 });
  return NextResponse.json({ results });
}
