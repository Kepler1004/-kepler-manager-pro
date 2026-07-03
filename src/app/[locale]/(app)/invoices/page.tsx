import { requireSection } from '@/lib/guards';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase-server';
import InvoicesClient from './ui';

export default async function InvoicesPage() {
  await requireSection('invoices');
  const t = await getTranslations();
  const db = await createClient();
  const { data: invoices } = await db
    .from('invoices')
    .select('id, period_year, period_month, total, status, currency, students(name, guardian_email)')
    .order('created_at', { ascending: false }).limit(200);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t('nav.invoices')}</h1>
      <InvoicesClient invoices={(invoices ?? []) as any} />
    </div>
  );
}
