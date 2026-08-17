import { requireSection } from '@/lib/guards';
import { getTranslations } from 'next-intl/server';
import { reportServerClient } from '@/lib/report/supabase';
import { localToday } from '@/lib/report/types';
import { DailyReportForm } from '@/components/report/DailyReportForm';

export default async function DailyReportPage() {
  const me = await requireSection('daily-report');
  const t = await getTranslations('report');
  const sb = await reportServerClient();
  const today = localToday();

  const { data: report } = await sb
    .from('daily_reports')
    .select('*')
    .eq('staff_id', me.id)
    .eq('report_date', today)
    .maybeSingle();

  if (report?.status === 'submitted') {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="mb-3 text-4xl">✅</div>
        <h1 className="mb-2 text-xl font-bold text-gray-800">{t('already_submitted_title')}</h1>
        <p className="text-sm text-gray-500">{t('already_submitted_desc')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold">{t('write_title')}</h1>
      <p className="mb-6 text-sm text-slate-500">{t('write_desc')}</p>
      <DailyReportForm />
    </div>
  );
}
