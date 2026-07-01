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
