'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase-server';
import { requireSection, getCurrentProfile } from '@/lib/guards';

export async function addExpense(formData: FormData) {
  await requireSection('invoices');
  const db = await createClient();
  const profile = await getCurrentProfile();
  const { error } = await db.from('expenses').insert({
    period_year: Number(formData.get('year')),
    period_month: Number(formData.get('month')),
    category: String(formData.get('category') || 'etc'),
    label: String(formData.get('label') || '') || null,
    amount: Number(formData.get('amount') || 0),
    created_by: profile?.id ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/finance');
}

export async function deleteExpense(formData: FormData) {
  await requireSection('invoices');
  const db = await createClient();
  const { error } = await db.from('expenses').delete().eq('id', String(formData.get('id')));
  if (error) throw new Error(error.message);
  revalidatePath('/finance');
}
