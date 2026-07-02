import { requireSection } from '@/lib/guards';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase-server';
import StudentsClient from './ui';

export default async function StudentsPage() {
  await requireSection('students');
  const t = await getTranslations();
  const db = await createClient();
  const { data: students } = await db
    .from('students')
    .select('id, name, name_en, school, grade, guardian_name, guardian_email, phone, status')
    .order('created_at', { ascending: false });

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t('nav.students')}</h1>
      <StudentsClient students={students ?? []} />
    </div>
  );
}
