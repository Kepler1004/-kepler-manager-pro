import { requireSection } from '@/lib/guards';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase-server';
import InvoiceActions from './actions';
import { Link } from '@/i18n/routing';

export default async function InvoicesPage() {
  await requireSection('invoices');
  const t = await getTranslations();
  const db = await createClient();
  const { data: invoices } = await db
    .from('invoices')
    .select('id, period_year, period_month, total, status, currency, students(name, guardian_email)')
    .order('created_at', { ascending: false }).limit(100);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('nav.invoices')}</h1>
        <InvoiceActions />
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr><th className="px-4 py-2">{t('common.student')}</th><th className="px-4 py-2">{t('common.period_label')}</th>
            <th className="px-4 py-2 text-right">{t('common.total')}</th>
            <th className="px-4 py-2">{t('common.status')}</th><th className="px-4 py-2"></th></tr>
          </thead>
          <tbody>
            {(invoices ?? []).map((inv: any) => (
              <tr key={inv.id} className="border-t border-slate-100">
                <td className="px-4 py-2"><Link href={`/invoices/${inv.id}`} className="text-indigo-600">{inv.students?.name}</Link></td>
                <td className="px-4 py-2">{inv.period_year}.{inv.period_month}</td>
                <td className="px-4 py-2 text-right">{inv.currency} {Number(inv.total).toFixed(2)}</td>
                <td className="px-4 py-2">{inv.status}</td>
                <td className="px-4 py-2 text-right"><InvoiceActions invoiceId={inv.id} sendOnly /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
