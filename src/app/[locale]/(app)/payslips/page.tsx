import { requireSection } from '@/lib/guards';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase-server';
import PayslipsClient from './ui';

export default async function PayslipsPage({ searchParams }: { searchParams: Promise<{ y?: string; m?: string }> }) {
  await requireSection('payslips');
  const t = await getTranslations();
  const sp = await searchParams;
  const now = new Date();
  const def = new Date(now.getFullYear(), now.getMonth() + 1, 1); // 기본: 다음 달(고지서 기간)
  const year = Number(sp.y) || def.getFullYear();
  const month = Number(sp.m) || (def.getMonth() + 1);

  const db = await createClient();
  const { data: slips } = await db
    .from('payslips')
    .select('id, total_sessions, base_pay, total_employee_deduction, net_pay, status, currency, profiles(full_name, email, employment_type)')
    .eq('period_year', year).eq('period_month', month)
    .order('created_at', { ascending: true });

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t('nav.payslips')}</h1>
      <PayslipsClient year={year} month={month} slips={(slips ?? []) as any} />
    </div>
  );
}
