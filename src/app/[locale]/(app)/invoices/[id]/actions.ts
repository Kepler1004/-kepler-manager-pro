'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { requireSection } from '@/lib/guards';

async function recompute(db: any, invoiceId: string) {
  const { data: inv } = await db.from('invoices').select('adjustments').eq('id', invoiceId).single();
  const { data: items } = await db.from('invoice_items').select('amount').eq('invoice_id', invoiceId);
  const subtotal = (items ?? []).reduce((s: number, it: any) => s + Number(it.amount), 0);
  const adj = (inv?.adjustments ?? []).reduce((s: number, a: any) => s + Number(a.amount), 0);
  await db.from('invoices').update({ subtotal, total: subtotal + adj }).eq('id', invoiceId);
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

export async function deleteInvoice(formData: FormData) {
  await requireSection('invoices');
  const db = await createClient();
  const invoiceId = String(formData.get('invoice_id'));
  const { error } = await db.from('invoices').delete().eq('id', invoiceId);
  if (error) throw new Error(error.message);
  redirect('/invoices');
}
