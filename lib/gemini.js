// Talks to the Gemini REST API and runs the tool-calling loop (same design as the Smart Medicine Inventory bot).
// Used by the website chat (/api/chat).
import { TOOL_DECLARATIONS, runTool } from '@/lib/chatTools';
import { UOMS } from '@/lib/items';

const SYSTEM = `You are the Item Creation Assistant for the Supply Chain department of a hospital.
You help staff create new item master records. Each record has: description, UNSPSC code, unit of measure (UOM), manufacturer, manufacturer part number.

How to work:
1. The user describes an item in Arabic or English. Reply in the user's language, but write item descriptions in English.
2. Build the standard description: noun first, UPPER CASE, size and specification at the end, no commas. Example: TUBE FEEDING NASOGASTRIC WITH STYLET 10FR X 140CM
3. ALWAYS call search_unspsc to find the code. Never write a UNSPSC code from memory. Pick the most specific commodity that fits. If two candidates are close, show the best one and mention the runner-up in one line. If the results do not fit or the tool reports unmatched_words, search again with a synonym or generic name (up to 3 searches). If nothing fits, tell the user and ask for more detail instead of guessing.
4. Call find_similar_items to check for duplicates. If a similar item exists, tell the user which one (ref and description) before going on.
5. If the UOM is missing, ask for it (allowed: ${UOMS.join(', ')}). Manufacturer and part number are optional: ask once, and accept "skip".
6. Show the proposed record in this exact layout, then ask "Create this draft? (yes / no)":
Description: ...
UNSPSC: code - title
Class: ... | Family: ... | Segment: ...
UOM: ...
Manufacturer: ... | Part number: ...
7. Call create_item_draft ONLY after the user confirms in a message that comes after your proposal. After it succeeds, give the reference (for example ITM-00003) and say a reviewer must approve it on the dashboard. You can never approve items.
8. If create_item_draft returns a duplicate warning, show the matching items and ask whether the new item is really different. Set confirm_not_duplicate to true only if the user says yes.
9. If a tool returns an error, tell the user what to fix. Never pretend an item was created.
Use plain text only: no markdown, no tables, no asterisks. Keep replies short.
If the question is not about creating or finding items, say you can only help with creating items and UNSPSC classification.`;

async function callGemini(contents, timeoutMs) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEy;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing in the environment');
  }
  const primaryModel = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
  const modelsToTry = [primaryModel];
  if (primaryModel !== 'gemini-flash-lite-latest') {
    modelsToTry.push('gemini-flash-lite-latest');
  }

  // One shared deadline for all models, so the fallback cannot exceed the time budget
  const endTime = Date.now() + timeoutMs;
  let lastErr = null;
  for (const model of modelsToTry) {
    const remaining = endTime - Date.now();
    if (remaining < 1000) break;
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents,
          tools: [{ functionDeclarations: TOOL_DECLARATIONS }]
        }),
        signal: AbortSignal.timeout(remaining)
      });
      if (res.ok) {
        return await res.json();
      }
      const errText = await res.text();
      lastErr = new Error(`Gemini ${res.status}: ${errText}`);
      // Retry with the fallback model on overload (503), missing model (404) or rate limit (429)
      if (res.status === 503 || res.status === 404 || res.status === 429) {
        console.warn(`Model ${model} returned ${res.status}, trying fallback...`);
        continue;
      }
      throw lastErr;
    } catch (e) {
      lastErr = e;
      if (model === modelsToTry[modelsToTry.length - 1]) throw e;
    }
  }
  throw lastErr || new Error('Gemini call failed');
}

// Turn earlier chat turns [{ from: 'me' | 'bot', text }] into Gemini contents.
// Roles must alternate user/model and the list must end with a model turn.
function historyToContents(history) {
  const out = [];
  let expected = 'user';
  for (const h of Array.isArray(history) ? history.slice(-12) : []) {
    const role = h && h.from === 'me' ? 'user' : 'model';
    const text = String((h && h.text) || '').slice(0, 1500);
    if (role !== expected || !text) continue;
    out.push({ role, parts: [{ text }] });
    expected = expected === 'user' ? 'model' : 'user';
  }
  if (expected === 'model') out.pop();
  return out;
}

// Returns { reply, draft } - draft is { id, ref } when a draft item was created during this turn
export async function askGemini(userText, history = []) {
  const contents = [...historyToContents(history), { role: 'user', parts: [{ text: userText }] }];
  let draft = null;

  const deadline = Date.now() + 25000;

  for (let step = 0; step < 6; step++) {
    const left = deadline - Date.now();
    if (left < 2000) return { reply: 'Sorry, that took too long. Please try again.', draft };

    const data = await callGemini(contents, Math.min(12000, left));
    const content = data.candidates?.[0]?.content;
    if (!content) return { reply: 'Sorry, I could not answer that.', draft };

    const parts = content.parts || [];
    const calls = parts.filter((p) => p.functionCall);

    // No tool requested: this is the final answer
    if (calls.length === 0) {
      const text = parts
        .filter((p) => p.text && !p.thought)
        .map((p) => p.text)
        .join('')
        .trim();
      return { reply: text || 'Sorry, I could not answer that.', draft };
    }

    // Keep the model turn exactly as returned (Gemini 3 needs its thought signatures back)
    contents.push(content);
    const responses = [];
    for (const p of calls) {
      const { name, args, id } = p.functionCall;
      let result;
      try {
        result = await runTool(name, args);
        if (name === 'create_item_draft' && result.created) draft = { id: result.id, ref: result.ref };
      } catch (err) {
        console.error('Tool failed:', name, err);
        result = { error: 'Tool failed' };
      }
      responses.push({ functionResponse: { name, ...(id ? { id } : {}), response: { result } } });
    }
    contents.push({ role: 'user', parts: responses });
  }
  return { reply: 'Sorry, that took too many steps. Please ask a simpler question.', draft };
}
