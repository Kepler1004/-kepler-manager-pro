'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase-server';

function parseClass(formData: FormData) {
  const g = (k: string) => { const v = formData.get(k); return v === null || v === '' ? null : String(v); };
  const days = formData.getAll('days').map((d) => Number(d)).filter((n) => !Number.isNaN(n));
  const uniqDays = [...new Set(days)].sort((a, b) => a - b);
  return {
    name: g('name') ?? '',
    subject_id: g('subject_id'),
    teacher_id: g('teacher_id'),
    days: uniqDays.length ? uniqDays : [1],
    day_of_week: (uniqDays[0] ?? 1),
    start_time: g('start_time') ?? '16:00',
    end_time: g('end_time') ?? '17:00',
    sessions_per_week: uniqDays.length || 1,
    session_price: Number(g('session_price') ?? 0),
    room: g('room'),
    is_active: g('is_active') === 'true',
  };
}

// 담당 선생님 1회 급여(teacher_salaries) 동기화
async function syncSalary(db: any, classId: string, teacherId: string | null, rate: number) {
  if (!teacherId) return;
  await db.from('teacher_salaries')
    .upsert({ teacher_id: teacherId, class_id: classId, rate_per_session: rate },
            { onConflict: 'teacher_id,class_id' });
}

export async function createClassRow(formData: FormData) {
  const db = await createClient();
  const row = parseClass(formData);
  const rate = Number(formData.get('rate_per_session') ?? 0);
  if (!row.name) return;
  const { data, error } = await db.from('classes').insert(row).select('id').single();
  if (error) throw new Error(error.message);
  await syncSalary(db, data.id, row.teacher_id, rate);
  revalidatePath('/classes');
}

export async function updateClassRow(formData: FormData) {
  const db = await createClient();
  const id = String(formData.get('id'));
  const row = parseClass(formData);
  const rate = Number(formData.get('rate_per_session') ?? 0);
  const { error } = await db.from('classes').update(row).eq('id', id);
  if (error) throw new Error(error.message);
  await syncSalary(db, id, row.teacher_id, rate);
  revalidatePath('/classes');
}

export async function deleteClassRow(formData: FormData) {
  const db = await createClient();
  const id = String(formData.get('id'));
  const { error } = await db.from('classes').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/classes');
}

export async function enrollStudent(formData: FormData) {
  const db = await createClient();
  const class_id = String(formData.get('class_id'));
  const student_id = String(formData.get('student_id'));
  if (!student_id) return;
  const { error } = await db.from('enrollments')
    .upsert({ class_id, student_id, status: 'active' }, { onConflict: 'student_id,class_id' });
  if (error) throw new Error(error.message);
  revalidatePath('/classes');
}

export async function unenrollStudent(formData: FormData) {
  const db = await createClient();
  const class_id = String(formData.get('class_id'));
  const student_id = String(formData.get('student_id'));
  const { error } = await db.from('enrollments').delete()
    .eq('class_id', class_id).eq('student_id', student_id);
  if (error) throw new Error(error.message);
  revalidatePath('/classes');
}
