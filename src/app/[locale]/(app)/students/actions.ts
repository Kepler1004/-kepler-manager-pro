'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase-server';

function parse(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return v === null || v === '' ? null : String(v);
  };
  return {
    name: get('name') ?? '',
    name_en: get('name_en'),
    school: get('school'),
    grade: get('grade'),
    guardian_name: get('guardian_name'),
    guardian_email: get('guardian_email') ?? '',
    phone: get('phone'),
    status: get('status') ?? 'active',
  };
}

export async function createStudent(formData: FormData) {
  const db = await createClient();
  const row = parse(formData);
  if (!row.name || !row.guardian_email) return;
  const { error } = await db.from('students').insert(row);
  if (error) throw new Error(error.message);
  revalidatePath('/students');
}

export async function updateStudent(formData: FormData) {
  const db = await createClient();
  const id = String(formData.get('id'));
  const row = parse(formData);
  const { error } = await db.from('students').update(row).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/students');
}

export async function deleteStudent(formData: FormData) {
  const db = await createClient();
  const id = String(formData.get('id'));
  const { error } = await db.from('students').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/students');
}

// 상담 기록 추가
export async function addCounselingNote(formData: FormData) {
  const db = await createClient();
  const student_id = String(formData.get('student_id'));
  const note_date = String(formData.get('note_date') || new Date().toISOString().slice(0, 10));
  const content = String(formData.get('content') ?? '').trim();
  if (!student_id || !content) throw new Error('내용을 입력하세요.');
  const { data: { user } } = await db.auth.getUser();
  let author_name: string | null = user?.email ?? null;
  if (user) {
    const { data: prof } = await db.from('profiles').select('full_name, email').eq('id', user.id).single();
    author_name = prof?.full_name || prof?.email || author_name;
  }
  const { error } = await db.from('counseling_notes')
    .insert({ student_id, note_date, content, author_id: user?.id ?? null, author_name });
  if (error) throw new Error(error.message);
  revalidatePath(`/students/${student_id}`);
}

export async function deleteCounselingNote(formData: FormData) {
  const db = await createClient();
  const id = String(formData.get('id'));
  const student_id = String(formData.get('student_id'));
  const { error } = await db.from('counseling_notes').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath(`/students/${student_id}`);
}

// 학생 사진 URL 저장
export async function updateStudentPhoto(studentId: string, photoUrl: string) {
  const db = await createClient();
  const { error } = await db.from('students').update({ photo_url: photoUrl }).eq('id', studentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/students/${studentId}`);
}
