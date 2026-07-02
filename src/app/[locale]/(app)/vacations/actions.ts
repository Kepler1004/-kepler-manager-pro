'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase-server';

export async function addVacation(formData: FormData) {
  const db = await createClient();
  const profile_id = String(formData.get('profile_id'));
  const start_date = String(formData.get('start_date'));
  const end_date = String(formData.get('end_date') || start_date);
  const days = Number(formData.get('days') || 1);
  const reason = (formData.get('reason') as string) || null;
  if (!profile_id || !start_date) throw new Error('대상과 날짜를 입력하세요.');
  const { error } = await db.from('vacations').insert({ profile_id, start_date, end_date, days, reason });
  if (error) throw new Error(error.message);
  revalidatePath('/vacations');
}

export async function deleteVacation(formData: FormData) {
  const db = await createClient();
  const id = String(formData.get('id'));
  const { error } = await db.from('vacations').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/vacations');
}

export async function setAnnualLeave(formData: FormData) {
  const db = await createClient();
  const profile_id = String(formData.get('profile_id'));
  const total = Number(formData.get('total') || 0);
  const { error } = await db.from('profiles').update({ annual_leave_total: total }).eq('id', profile_id);
  if (error) throw new Error(error.message);
  revalidatePath('/vacations');
}
