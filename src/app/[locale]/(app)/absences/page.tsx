import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase-server';
import AbsencesClient from './ui';

export default async function AbsencesPage() {
  const t = await getTranslations();
  const db = await createClient();
  const [{ data: students }, { data: classes }, { data: enrollments }, { data: absences }] = await Promise.all([
    db.from('students').select('id, name').eq('status', 'active').order('name'),
    db.from('classes').select('id, name').order('name'),
    db.from('enrollments').select('class_id, student_id').eq('status', 'active'),
    db.from('planned_absences').select('id, student_id, class_id, absence_date, reason').order('absence_date', { ascending: false }).limit(200),
  ]);
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">{t('absence.title')}</h1>
      <p className="mb-4 text-sm text-slate-500">{t('absence.calendar_note')}</p>
      <AbsencesClient
        students={students ?? []} classes={classes ?? []}
        enrollments={enrollments ?? []} absences={absences ?? []} />
    </div>
  );
}
