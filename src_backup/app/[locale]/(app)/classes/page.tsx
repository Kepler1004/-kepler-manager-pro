import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase-server';
import ClassesClient from './ui';

export default async function ClassesPage() {
  const t = await getTranslations();
  const db = await createClient();

  const [{ data: classes }, { data: subjects }, { data: teachers }, { data: students }, { data: salaries }, { data: enrollments }] =
    await Promise.all([
      db.from('classes').select('id, name, subject_id, teacher_id, day_of_week, start_time, end_time, sessions_per_week, session_price, room, is_active').order('day_of_week'),
      db.from('subjects').select('id, name').order('name'),
      db.from('profiles').select('id, full_name, email').eq('role', 'teacher').eq('is_active', true),
      db.from('students').select('id, name').eq('status', 'active').order('name'),
      db.from('teacher_salaries').select('class_id, teacher_id, rate_per_session'),
      db.from('enrollments').select('class_id, student_id, status').eq('status', 'active'),
    ]);

  const teacherOpts = (teachers ?? []).map((x) => ({ id: x.id, name: x.full_name || x.email }));
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t('nav.classes')}</h1>
      <ClassesClient
        classes={classes ?? []}
        subjects={subjects ?? []}
        teachers={teacherOpts}
        students={students ?? []}
        salaries={salaries ?? []}
        enrollments={enrollments ?? []}
      />
    </div>
  );
}
