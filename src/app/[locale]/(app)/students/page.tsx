import { requireSection } from '@/lib/guards';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase-server';
import StudentsClient from './ui';

const SORTS: Record<string, { col: string; asc: boolean }> = {
  name:    { col: 'name', asc: true },
  grade:   { col: 'grade', asc: true },
  school:  { col: 'school', asc: true },
  created: { col: 'created_at', asc: false },
};

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  await requireSection('students');
  const t = await getTranslations();
  const sp = await searchParams;
  const sort = SORTS[sp.sort ?? 'created'] ? (sp.sort ?? 'created') : 'created';
  const { col, asc } = SORTS[sort];
  const db = await createClient();
  const { data: students } = await db
    .from('students')
    .select('id, name, name_en, school, grade, guardian_name, guardian_email, phone, status')
    .order(col, { ascending: asc, nullsFirst: false });

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t('nav.students')}</h1>
      <StudentsClient students={students ?? []} sort={sort} />
    </div>
  );
}
