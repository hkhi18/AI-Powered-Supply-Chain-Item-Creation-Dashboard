'use server';
// Server Actions: create a draft from the form, and approve / reject a draft.
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { query } from '@/lib/db';
import { createDraft } from '@/lib/items';
import { audit } from '@/lib/audit';

// Used with useActionState: returns { error, duplicates, values } on failure, redirects on success
export async function createItemAction(_prev, formData) {
  const values = {
    description: String(formData.get('description') || ''),
    unspsc_code: String(formData.get('unspsc_code') || ''),
    uom: String(formData.get('uom') || ''),
    manufacturer: String(formData.get('manufacturer') || ''),
    part_number: String(formData.get('part_number') || ''),
    notes: String(formData.get('notes') || ''),
    created_by: String(formData.get('created_by') || '').trim().slice(0, 60),
    allow_duplicate: formData.get('allow_duplicate') === 'on'
  };
  if (!values.created_by) return { error: 'Enter your name in "Created by".', values };
  if (!values.unspsc_code) return { error: 'Pick a UNSPSC code from the search results.', values };

  const result = await createDraft(values, { source: 'form', actor: values.created_by, allowDuplicate: values.allow_duplicate });
  if (!result.created) return { error: result.error, duplicates: result.duplicates || [], values };

  revalidatePath('/');
  revalidatePath('/items');
  redirect(`/items/${result.item.id}?created=1`);
}

// Approve or reject a draft (only drafts can be reviewed)
export async function reviewItemAction(formData) {
  const id = Number(formData.get('id'));
  const decision = String(formData.get('decision'));
  const reviewer = String(formData.get('reviewer') || '').trim().slice(0, 60);
  const note = String(formData.get('note') || '').trim().slice(0, 500);
  const erp = String(formData.get('erp_item_no') || '').trim().slice(0, 30);

  const back = (msg) => redirect(`/items/${id}?err=${encodeURIComponent(msg)}`);
  if (!Number.isInteger(id)) throw new Error('Invalid item');
  if (!['approve', 'reject'].includes(decision)) throw new Error('Invalid decision');
  if (!reviewer) back('Enter your name as reviewer.');
  if (decision === 'reject' && !note) back('A rejection needs a reason in the note.');

  const status = decision === 'approve' ? 'approved' : 'rejected';
  const rows = await query(
    `UPDATE items SET status = $1, reviewed_by = $2, reviewed_at = now(), review_note = $3, erp_item_no = $4
      WHERE id = $5 AND status = 'draft' RETURNING ref`,
    [status, reviewer, note || null, erp || null, id]
  );
  if (rows.length === 0) back('This item is no longer a draft.');
  await audit(reviewer, `item_${status}`, rows[0].ref, note || null);

  revalidatePath('/');
  revalidatePath('/items');
  redirect(`/items/${id}?done=${status}`);
}
