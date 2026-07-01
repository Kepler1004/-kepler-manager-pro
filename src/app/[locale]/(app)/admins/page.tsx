import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { getCurrentProfile } from '@/lib/guards';
import AdminsClient from './ui';

export default async function AdminsPage() {
  const t = await getTranslations();
  const me = await getCurrentProfile();
  if (me?.role !== 'master') redirect('/dashboard');

  const db = await createClient();
  const { data: profiles } = await db
    .from('profiles').select('id, full_name, email, role, is_active, employment_type, fixed_base_salary, tax_no, ic_no, epf_no, bank_account, allowance, google_calendar_id, payroll_config')
    .order('created_at', { ascending: true });

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t('nav.admins')}</h1>
      <AdminsClient profiles={profiles ?? []} meId={me.id} />
    </div>
  );
}
