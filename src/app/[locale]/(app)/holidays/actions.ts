'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase-server';

export async function addHoliday(formData: FormData) {
  const db = await createClient();
  const holiday_date = String(formData.get('holiday_date'));
  const name = String(formData.get('name') ?? '').trim() || '공휴일';
  if (!holiday_date) throw new Error('날짜를 입력하세요.');
  const { error } = await db.from('holidays')
    .upsert({ holiday_date, name, source: 'manual' }, { onConflict: 'holiday_date' });
  if (error) throw new Error(error.message);
  revalidatePath('/holidays');
}

export async function deleteHoliday(formData: FormData) {
  const db = await createClient();
  const id = String(formData.get('id'));
  const { error } = await db.from('holidays').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/holidays');
}
