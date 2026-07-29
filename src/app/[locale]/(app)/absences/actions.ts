'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase-server';
import { regenerateInvoiceIfExists } from '@/lib/invoice-service';

export async function addAbsence(formData: FormData) {
  const db = await createClient();
  const student_id = String(formData.get('student_id'));
  const class_id = String(formData.get('class_id'));
  const start = String(formData.get('absence_date'));
  const end = String(formData.get('end_date') || start);
  const reason = (formData.get('reason') as string) || null;
  if (!student_id || !class_id || !start) throw new Error('학생/수업/날짜를 모두 선택하세요.');

  const { data: { user } } = await db.auth.getUser();

  // 단일 날짜면 그대로, 기간이면 해당 수업의 요일에 걸치는 날짜만 펼쳐서 등록
  let dates: string[] = [start];
  if (end && end !== start) {
    const { data: cls } = await db.from('classes').select('day_of_week, days').eq('id', class_id).single();
    const classDays: number[] = (cls?.days && cls.days.length ? cls.days : [cls?.day_of_week]).filter((x: any) => x != null);
    dates = [];
    const d = new Date(start + 'T00:00:00');
    const last = new Date(end + 'T00:00:00');
    while (d <= last) {
      if (classDays.length === 0 || classDays.includes(d.getDay())) {
        dates.push(d.toISOString().slice(0, 10));
      }
      d.setDate(d.getDate() + 1);
    }
    if (dates.length === 0) throw new Error('선택 기간에 해당 수업 요일이 없습니다.');
  }

  const rows = dates.map((absence_date) => ({ student_id, class_id, absence_date, reason, created_by: user?.id }));
  const { error } = await db.from('planned_absences')
    .upsert(rows, { onConflict: 'student_id,class_id,absence_date' });
  if (error) throw new Error(error.message);

  const _months = Array.from(new Set(dates.map((d) => d.slice(0, 7))));
  for (const ym of _months) {
    const [y, m] = ym.split('-').map(Number);
    try { await regenerateInvoiceIfExists(student_id, y, m); } catch (e) { console.error('regen(absence add)', e); }
  }

  revalidatePath('/absences');
}

export async function deleteAbsence(formData: FormData) {
  const db = await createClient();
  const id = String(formData.get('id'));
  const { data: _row } = await db.from('planned_absences')
    .select('student_id, absence_date').eq('id', id).maybeSingle();
  const { error } = await db.from('planned_absences').delete().eq('id', id);
  if (error) throw new Error(error.message);
  if (_row) {
    const [y, m] = String(_row.absence_date).slice(0, 7).split('-').map(Number);
    try { await regenerateInvoiceIfExists(_row.student_id, y, m); } catch (e) { console.error('regen(absence delete)', e); }
  }
  revalidatePath('/absences');
}
