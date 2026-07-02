import { requireSection } from '@/lib/guards';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase-server';
import StudentSearch from '@/components/StudentSearch';

export default async function Dashboard() {
  await requireSection('dashboard');
  const t = await getTranslations();
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();

  const [{ count: students }, { count: teachers }, { count: unpaid }] = await Promise.all([
    db.from('students').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    db.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
    db.from('invoices').select('*', { count: 'exact', head: true }).neq('status', 'paid'),
  ]);

  const Card = ({ label, value }: { label: string; value: number | null }) => (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-bold">{value ?? 0}</div>
    </div>
  );
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">{t('nav.dashboard')}</h1>
      <p className="mb-4 text-slate-500">{t('dashboard.welcome', { name: user?.email ?? 'Kepler' })}</p>
      <StudentSearch />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card label={t('dashboard.students_active')} value={students ?? 0} />
        <Card label={t('dashboard.teachers')} value={teachers ?? 0} />
        <Card label={t('dashboard.unpaid')} value={unpaid ?? 0} />
      </div>
    </div>
  );
}
