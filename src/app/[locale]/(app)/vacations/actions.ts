'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase-server';

export async function addVacation(formData: FormData) {
  const db = await createClient();
  const profile_id = String(formData.get('profile_id'));
  const start_date = String(formData.get('start_date'));
  const end_date = String(formData.get('end_date') || start_date);
  const reason = (formData.get('reason') as string) || null;
  if (!profile_id || !start_date) throw new Error('대상과 날짜를 입력하세요.');

  // 대상의 근무요일 + 기간 내 공휴일 조회
  const { data: prof } = await db.from('profiles').select('work_days').eq('id', profile_id).single();
  const workDays: number[] = (prof?.work_days && prof.work_days.length ? prof.work_days : [1, 2, 3, 4, 5]);
  const { data: hols } = await db.from('holidays').select('holiday_date')
    .gte('holiday_date', start_date).lte('holiday_date', end_date);
  const holidaySet = new Set((hols ?? []).map((h: any) => h.holiday_date));

  // 근무요일이면서 공휴일이 아닌 날만 카운팅
  let days = 0;
  const d = new Date(start_date + 'T00:00:00');
  const last = new Date(end_date + 'T00:00:00');
  while (d <= last) {
    const iso = d.toISOString().slice(0, 10);
    if (workDays.includes(d.getDay()) && !holidaySet.has(iso)) days += 1;
    d.setDate(d.getDate() + 1);
  }

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
