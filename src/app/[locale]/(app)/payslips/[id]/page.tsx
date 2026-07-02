import { requireSection } from '@/lib/guards';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { createClient } from '@/lib/supabase-server';
import PayslipDetailClient from './ui';

export default async function PayslipDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireSection('payslips');
  const { id } = await params;
  const t = await getTranslations();
  const db = await createClient();

  const { data: slip } = await db
    .from('payslips')
    .select('*, profiles(full_name, email, employment_type, tax_no, ic_no, epf_no), payslip_items(*)')
    .eq('id', id).single();
  if (!slip) notFound();

  // 같은 선생님 최근 6개월 히스토리
  const { data: history } = await db
    .from('payslips')
    .select('id, period_year, period_month, net_pay, status, currency')
    .eq('teacher_id', slip.teacher_id)
    .order('period_year', { ascending: false }).order('period_month', { ascending: false })
    .limit(6);

  return (
    <div className="max-w-4xl">
      <Link href="/payslips" className="text-sm text-indigo-600">← {t('nav.payslips')}</Link>
      <PayslipDetailClient slip={slip as any} history={(history ?? []) as any} />
    </div>
  );
}
