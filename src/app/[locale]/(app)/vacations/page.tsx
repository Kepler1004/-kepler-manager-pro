import { getTranslations } from 'next-intl/server';
import { requireSection } from '@/lib/guards';
import { createClient } from '@/lib/supabase-server';
import VacationsClient from './ui';

export default async function VacationsPage() {
  await requireSection('vacations');
  const t = await getTranslations();
  const db = await createClient();
  const year = new Date().getFullYear();

  const [{ data: people }, { data: vacs }] = await Promise.all([
    db.from('profiles').select('id, full_name, email, role, annual_leave_total')
      .in('role', ['master', 'admin', 'admin_b', 'teacher']).eq('is_active', true).order('role'),
    db.from('vacations').select('id, profile_id, start_date, end_date, days, reason')
      .gte('start_date', `${year}-01-01`).lte('start_date', `${year}-12-31`)
      .order('start_date', { ascending: false }),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">{t('nav.vacations')}</h1>
      <p className="mb-4 text-sm text-slate-500">{t('vacation.note', { year })}</p>
      <VacationsClient people={people ?? []} vacations={vacs ?? []} year={year} />
    </div>
  );
}
