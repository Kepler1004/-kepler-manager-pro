'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase-server';

export async function addAbsence(formData: FormData) {
  const db = await createClient();
  const student_id = String(formData.get('student_id'));
  const class_id = String(formData.get('class_id'));
  const absence_date = String(formData.get('absence_date'));
  const reason = (formData.get('reason') as string) || null;
  if (!student_id || !class_id || !absence_date) throw new Error('학생/수업/날짜를 모두 선택하세요.');

  const { data: { user } } = await db.auth.getUser();
  const { error } = await db.from('planned_absences')
    .upsert({ student_id, class_id, absence_date, reason, created_by: user?.id },
            { onConflict: 'student_id,class_id,absence_date' });
  if (error) throw new Error(error.message);
  revalidatePath('/absences');
}

export async function deleteAbsence(formData: FormData) {
  const db = await createClient();
  const id = String(formData.get('id'));
  const { error } = await db.from('planned_absences').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/absences');
}
