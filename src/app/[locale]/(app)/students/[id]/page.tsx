import { requireSection } from '@/lib/guards';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { createClient } from '@/lib/supabase-server';
import StudentDetailClient from './ui';

export default async function StudentDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireSection('students');
  const { id } = await params;
  const t = await getTranslations();
  const db = await createClient();

  const { data: student } = await db.from('students')
    .select('id, name, name_en, school, grade, guardian_name, guardian_email, phone, status, photo_url')
    .eq('id', id).single();
  if (!student) notFound();

  const { data: notes } = await db.from('counseling_notes')
    .select('id, note_date, content, author_name')
    .eq('student_id', id).order('note_date', { ascending: false }).order('created_at', { ascending: false });

  const { data: enrollments } = await db
    .from('enrollments')
    .select('status, classes(name, day_of_week, days, start_time, end_time, room)')
    .eq('student_id', id)
    .eq('status', 'active');

  return (
    <div className="max-w-3xl">
      <Link href="/students" className="text-sm text-indigo-600">← {t('nav.students')}</Link>
      <StudentDetailClient student={student} notes={notes ?? []} enrollments={(enrollments ?? []) as any} />
    </div>
  );
}
