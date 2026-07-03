import { requireSection } from '@/lib/guards';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { createClient } from '@/lib/supabase-server';
import InvoiceSend from './send';
import InvoiceItemsEditor from './edit';

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

export default async function InvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireSection('invoices');
  const { id } = await params;
  const t = await getTranslations();
  const db = await createClient();

  const { data: inv } = await db
    .from('invoices')
    .select('*, students(name, guardian_name, guardian_email), invoice_items(*)')
    .eq('id', id).single();
  if (!inv) notFound();
  const stu: any = inv.students;
  const items: any[] = (inv.invoice_items ?? []).sort((a: any, b: any) => a.day_of_week - b.day_of_week);

  return (
    <div className="max-w-3xl">
      <Link href="/invoices" className="text-sm text-indigo-600">← {t('nav.invoices')}</Link>
      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">{t('invoice.title')}</h1>
            <p className="text-slate-500">{inv.period_year}.{inv.period_month} · {stu?.name}</p>
            <p className="text-xs text-slate-400">{stu?.guardian_email}</p>
          </div>
          <InvoiceSend invoiceId={inv.id} status={inv.status} />
        </div>

        <InvoiceItemsEditor invoiceId={inv.id} items={items as any} />

        <div className="mt-4 space-y-1 text-right text-sm">
          <div>{t('common.subtotal')}: {inv.currency} {Number(inv.subtotal).toFixed(2)}</div>
          {(inv.adjustments ?? []).map((a: any, i: number) => (
            <div key={i} className="text-slate-500">{a.label}: {inv.currency} {Number(a.amount).toFixed(2)}</div>
          ))}
          <div className="text-lg font-bold">{t('common.total')}: {inv.currency} {Number(inv.total).toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}
