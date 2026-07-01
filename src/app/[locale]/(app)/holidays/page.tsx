import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase-server';
import HolidaysClient from './ui';

export default async function HolidaysPage() {
  const t = await getTranslations();
  const db = await createClient();
  const year = new Date().getFullYear();
  const { data: holidays } = await db
    .from('holidays')
    .select('id, holiday_date, name, source')
    .gte('holiday_date', `${year}-01-01`)
    .order('holiday_date');
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">{t('holiday.title')}</h1>
      <p className="mb-4 text-sm text-slate-500">{t('holiday.note')}</p>
      <HolidaysClient holidays={holidays ?? []} />
    </div>
  );
}
