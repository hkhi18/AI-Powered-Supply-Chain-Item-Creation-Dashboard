// Tools the chatbot may call. The AI never writes SQL and never invents UNSPSC codes:
// it only picks a tool and its arguments, and every tool validates its input on the server.
// The AI can only create DRAFTS. Approving an item is a human step on the dashboard.
import { searchUnspsc, searchWords } from '@/lib/unspsc';
import { findSimilarItems, createDraft, normalizeDescription, UOMS } from '@/lib/items';
import { getKpis } from '@/lib/queries';

export const TOOL_DECLARATIONS = [
  {
    name: 'search_unspsc',
    description:
      'Search the UNSPSC v26.0801 goods taxonomy. Use it for EVERY new item before proposing a code. Returns candidate commodity codes with their class, family and segment, best match first. Search with the product noun first, for example "nasogastric tube" or "surgical gloves nitrile".',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Product name in English, 1 to 5 words' },
        limit: { type: 'integer', description: 'Maximum candidates (default 8, maximum 15)' }
      },
      required: ['query']
    }
  },
  {
    name: 'find_similar_items',
    description:
      'Check the item master for existing items that look like the new one (duplicate check). Call it before proposing the record to the user.',
    parameters: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'Standard item description (upper case)' },
        part_number: { type: 'string', description: 'Manufacturer part number, if known' },
        manufacturer: { type: 'string', description: 'Manufacturer name, if known' }
      },
      required: ['description']
    }
  },
  {
    name: 'create_item_draft',
    description:
      'Create a DRAFT item record for human review. Call it ONLY after the user has confirmed the proposed record. The unspsc_code must come from search_unspsc results.',
    parameters: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'Standard description: noun first, upper case, size/spec at the end' },
        unspsc_code: { type: 'integer', description: '8-digit commodity code from search_unspsc' },
        uom: { type: 'string', enum: UOMS, description: 'Unit of measure' },
        manufacturer: { type: 'string', description: 'Manufacturer name (optional)' },
        part_number: { type: 'string', description: 'Manufacturer part number (optional)' },
        notes: { type: 'string', description: 'Short note for the reviewer (optional)' },
        confirm_not_duplicate: {
          type: 'boolean',
          description: 'true only if the user saw the duplicate warning and said it is a different item'
        }
      },
      required: ['description', 'unspsc_code', 'uom']
    }
  },
  {
    name: 'get_summary',
    description: 'Overall numbers: total items, drafts waiting for review, approved, rejected, UNSPSC codes loaded.'
  }
];

export async function runTool(name, args = {}) {
  if (name === 'search_unspsc') {
    const rows = await searchUnspsc(args.query, { limit: Math.min(Math.max(Number(args.limit) || 8, 1), 15) });
    // Words of the query that appear nowhere in the results: usually means UNSPSC uses another name
    const text = rows.map((r) => `${r.title} ${r.class.title} ${r.family.title}`.toLowerCase()).join(' ');
    const unmatched = searchWords(args.query).filter((w) => !new RegExp(`\\b${w}`).test(text));
    return {
      total_returned: rows.length,
      ...(unmatched.length
        ? { unmatched_words: unmatched, hint: 'These words are not in any candidate. UNSPSC may use a synonym or the generic name (for example acetaminophen for paracetamol). Search again with another name before proposing a code.' }
        : {}),
      candidates: rows.map((r) => ({
        code: r.code,
        title: r.title,
        class: r.class.title,
        family: r.family.title,
        segment: r.segment.title,
        match_score: r.score,
        // the first sentence of the UNSPSC definition helps tell near-identical titles apart
        definition: r.definition ? r.definition.slice(0, 160) : null
      }))
    };
  }

  if (name === 'find_similar_items') {
    const similar = await findSimilarItems({
      description: args.description,
      partNumber: args.part_number,
      manufacturer: args.manufacturer
    });
    return { normalized_description: normalizeDescription(args.description), similar_count: similar.length, similar };
  }

  if (name === 'create_item_draft') {
    const result = await createDraft(args, {
      source: 'chatbot',
      actor: 'chatbot',
      allowDuplicate: args.confirm_not_duplicate === true
    });
    if (!result.created) return { created: false, error: result.error, duplicates: result.duplicates || [] };
    return {
      created: true,
      ref: result.item.ref,
      id: result.item.id,
      status: 'draft',
      description: result.item.description,
      unspsc: `${result.item.unspsc.code} ${result.item.unspsc.title}`,
      uom: result.item.uom,
      next_step: 'A reviewer must approve the draft on the dashboard before it is used.'
    };
  }

  if (name === 'get_summary') {
    const k = await getKpis();
    return { total_items: k.total, drafts_waiting: k.drafts, approved: k.approved, rejected: k.rejected, unspsc_codes_loaded: k.unspsc_codes };
  }

  return { error: 'Unknown tool' };
}
