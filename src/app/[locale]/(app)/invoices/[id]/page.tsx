import { requireSection } from '@/lib/guards';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { createClient } from '@/lib/supabase-server';
import InvoiceSend from './send';
import InvoiceItemsEditor from './edit';
import { StatusToggle, AdjustmentRow, AddAdjustment } from './adjust';
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
  const discountRate = Number(inv.discount_rate ?? 0);
  const discountAmount = Number(inv.discount_amount ?? 0);
  const registrationFee = Number(inv.registration_fee ?? 0);
  const textbookFee = Number(inv.textbook_fee ?? 0);
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
          <div className="flex items-center gap-2">
            <StatusToggle invoiceId={inv.id} status={inv.status} />
            <InvoiceSend invoiceId={inv.id} status={inv.status} />
          </div>
        </div>
        <InvoiceItemsEditor
          invoiceId={inv.id}
          items={items as any}
          charges={{
            discount_rate: inv.discount_rate,
            registration_fee: inv.registration_fee,
            textbook_fee: inv.textbook_fee,
          }}
        />
        <div className="mt-4 space-y-1 text-right text-sm">
          <div>{t('common.subtotal')}: {inv.currency} {Number(inv.subtotal).toFixed(2)}</div>
          {discountRate > 0 && (
            <div className="text-emerald-600">
              {t('invoice.discount_rate')} ({discountRate}%): −{inv.currency} {discountAmount.toFixed(2)}
            </div>
          )}
          {registrationFee > 0 && (
            <div>{t('invoice.registration_fee')}: {inv.currency} {registrationFee.toFixed(2)}</div>
          )}
          {textbookFee > 0 && (
            <div>{t('invoice.textbook_fee')}: {inv.currency} {textbookFee.toFixed(2)}</div>
          )}
          {(inv.adjustments ?? []).map((a: any, i: number) => (
            <AdjustmentRow key={i} invoiceId={inv.id} index={i} label={a.label} amount={a.amount} currency={inv.currency} />
          ))}
          <div className="text-lg font-bold">{t('common.total')}: {inv.currency} {Number(inv.total).toFixed(2)}</div>
        </div>
        <AddAdjustment invoiceId={inv.id} />
      </div>
    </div>
  );
}
