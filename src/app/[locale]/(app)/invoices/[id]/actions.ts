'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { requireSection } from '@/lib/guards';

function round2(n: number) { return Math.round((n + Number.EPSILON) * 100) / 100; }

async function recompute(db: any, invoiceId: string) {
  const { data: inv } = await db
    .from('invoices')
    .select('adjustments, discount_rate, registration_fee, textbook_fee')
    .eq('id', invoiceId).single();
  const { data: items } = await db.from('invoice_items').select('amount').eq('invoice_id', invoiceId);

  const subtotal = round2((items ?? []).reduce((s: number, it: any) => s + Number(it.amount), 0));
  const adj = (inv?.adjustments ?? []).reduce((s: number, a: any) => s + Number(a.amount), 0);

  const rawRate = Number(inv?.discount_rate || 0);
  const discountRate = rawRate < 0 ? 0 : rawRate > 100 ? 100 : rawRate;
  const registrationFee = Number(inv?.registration_fee || 0);
  const textbookFee = Number(inv?.textbook_fee || 0);
  const discountAmount = round2(subtotal * (discountRate / 100));

  const total = round2(subtotal - discountAmount + registrationFee + textbookFee + adj);
  await db.from('invoices')
    .update({ subtotal, discount_amount: discountAmount, total })
    .eq('id', invoiceId);
}

export async function updateInvoiceItem(formData: FormData) {
  await requireSection('invoices');
  const db = await createClient();
  const itemId = String(formData.get('item_id'));
  const invoiceId = String(formData.get('invoice_id'));
  const sessions = Number(formData.get('sessions') || 0);
  const unit_price = Number(formData.get('unit_price') || 0);
  const amount = Math.round(sessions * unit_price * 100) / 100;
  const { error } = await db.from('invoice_items').update({ sessions, unit_price, amount }).eq('id', itemId);
  if (error) throw new Error(error.message);
  await recompute(db, invoiceId);
  revalidatePath(`/invoices/${invoiceId}`);
}

export async function deleteInvoiceItem(formData: FormData) {
  await requireSection('invoices');
  const db = await createClient();
  const itemId = String(formData.get('item_id'));
  const invoiceId = String(formData.get('invoice_id'));
  const { error } = await db.from('invoice_items').delete().eq('id', itemId);
  if (error) throw new Error(error.message);
  await recompute(db, invoiceId);
  revalidatePath(`/invoices/${invoiceId}`);
}

export async function updateInvoiceCharges(formData: FormData) {
  await requireSection('invoices');
  const db = await createClient();
  const invoiceId = String(formData.get('invoice_id'));

  const rawRate = Number(formData.get('discount_rate') || 0);
  const discount_rate = rawRate < 0 ? 0 : rawRate > 100 ? 100 : rawRate;
  const registration_fee = Math.max(0, Number(formData.get('registration_fee') || 0));
  const textbook_fee = Math.max(0, Number(formData.get('textbook_fee') || 0));

  const { error } = await db.from('invoices')
    .update({ discount_rate, registration_fee, textbook_fee })
    .eq('id', invoiceId);
  if (error) throw new Error(error.message);
  await recompute(db, invoiceId);
  revalidatePath(`/invoices/${invoiceId}`);
}

export async function deleteInvoice(formData: FormData) {
  await requireSection('invoices');
  const db = await createClient();
  const invoiceId = String(formData.get('invoice_id'));
  const { error } = await db.from('invoices').delete().eq('id', invoiceId);
  if (error) throw new Error(error.message);
  redirect('/invoices');
}

export async function addAdjustment(formData: FormData) {
  await requireSection('invoices');
  const db = await createClient();
  const invoiceId = String(formData.get('invoice_id'));
  const label = String(formData.get('label') || '').trim();
  const sessions = Number(formData.get('sessions') || 0);
  const unit = Number(formData.get('unit_price') || 0);
  const direct = formData.get('amount');
  let amount = direct != null && String(direct) !== '' ? Number(direct) : sessions * unit;
  amount = Math.round(amount * 100) / 100;
  if (!label) throw new Error('reason_required');
  if (!amount) throw new Error('amount_required');

  const { data: inv } = await db.from('invoices').select('adjustments').eq('id', invoiceId).single();
  const next = [...(inv?.adjustments ?? []), {label, amount }];
  const { error } = await db.from('invoices').update({ adjustments: next }).eq('id', invoiceId);
  if (error) throw new Error(error.message);
  await recompute(db, invoiceId);
  revalidatePath(`/invoices/${invoiceId}`);
}

export async function removeAdjustment(formData: FormData) {
  await requireSection('invoices');
  const db = await createClient();
  const invoiceId = String(formData.get('invoice_id'));
  const index = Number(formData.get('index'));
  const { data: inv } = await db.from('invoices').select('adjustments').eq('id', invoiceId).single();
  const next = (inv?.adjustments ?? []).filter((_: any, i: number) => i !== index);
  const { error } = await db.from('invoices').update({ adjustments: next }).eq('id', invoiceId);
  if (error) throw new Error(error.message);
  await recompute(db, invoiceId);
  revalidatePath(`/invoices/${invoiceId}`);
}

export async function setInvoiceStatus(formData: FormData) {
  await requireSection('invoices');
  const db = await createClient();
  const invoiceId = String(formData.get('invoice_id'));
  const status = String(formData.get('status'));
  const patch: Record<string, any> = {};
  if (status === 'paid') {
    patch.status = 'paid';
    patch.paid_at = new Date().toISOString();
  } else {
    // 납부완료 해제: 발송된 적 있으면 sent, 아니면 draft 로 복귀
    const { data: cur } = await db.from('invoices').select('sent_at').eq('id', invoiceId).single();
    patch.status = cur?.sent_at ? 'sent' : 'draft';
    patch.paid_at = null;
  }
  const { error } = await db.from('invoices').update(patch).eq('id', invoiceId);
  if (error) throw new Error(error.message);
  revalidatePath(`/invoices/${invoiceId}`);
}

export async function deleteInvoicesBulk(formData: FormData) {
  await requireSection('invoices');
  const db = await createClient();
  const ids = JSON.parse(String(formData.get('ids') || '[]')) as string[];
  if (!ids.length) return;
  const { error } = await db.from('invoices').delete().in('id', ids);
  if (error) throw new Error(error.message);
  revalidatePath('/invoices');
}
