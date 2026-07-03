'use client';
import { useTranslations } from 'next-intl';
import { updateInvoiceItem, deleteInvoiceItem, deleteInvoice } from './actions';

const DOW = ['일', '월', '화', '수', '목', '금', '토'];
type Item = { id: string; class_name: string; day_of_week: number; day_label?: string|null; time_label?: string|null;
  sessions: number; absent_sessions?: number|null; holiday_sessions?: number|null; unit_price: number; amount: number };

export default function InvoiceItemsEditor({ invoiceId, items }: { invoiceId: string; items: Item[] }) {
  const t = useTranslations();
  return (
    <div>
      <table className="mt-5 w-full text-sm">
        <thead className="border-b text-left text-slate-500">
          <tr>
            <th className="py-2">{t('common.class')}</th><th className="py-2">{t('common.day')}</th>
            <th className="py-2">{t('common.time')}</th><th className="py-2 text-right">{t('common.session')}</th>
            <th className="py-2 text-right">{t('common.unit_price')}</th><th className="py-2 text-right">{t('common.amount')}</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="border-b border-slate-100">
              <td className="py-2">{it.class_name}</td>
              <td className="py-2">{it.day_label || DOW[it.day_of_week]}</td>
              <td className="py-2">{it.time_label}</td>
              <td className="py-2 text-right">
                <form action={updateInvoiceItem} className="flex items-center justify-end gap-1">
                  <input type="hidden" name="item_id" value={it.id} />
                  <input type="hidden" name="invoice_id" value={invoiceId} />
                  <input name="sessions" type="number" step="1" defaultValue={it.sessions} className="w-14 rounded border border-slate-300 px-1 py-0.5 text-right" />
                  <input name="unit_price" type="number" step="0.01" defaultValue={Number(it.unit_price)} className="w-20 rounded border border-slate-300 px-1 py-0.5 text-right" />
                  <button className="rounded bg-slate-900 px-2 py-0.5 text-xs text-white">{t('common.save')}</button>
                </form>
              </td>
              <td className="py-2 text-right text-slate-400">{Number(it.unit_price).toFixed(2)}</td>
              <td className="py-2 text-right">{Number(it.amount).toFixed(2)}</td>
              <td className="py-2 text-right">
                <form action={deleteInvoiceItem} className="inline">
                  <input type="hidden" name="item_id" value={it.id} />
                  <input type="hidden" name="invoice_id" value={invoiceId} />
                  <button className="text-rose-500 text-xs">{t('common.delete')}</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4">
        <form action={deleteInvoice} onSubmit={(e) => { if (!confirm(t('invoice.confirm_delete'))) e.preventDefault(); }}>
          <input type="hidden" name="invoice_id" value={invoiceId} />
          <button className="text-sm text-rose-600">{t('invoice.delete_invoice')}</button>
        </form>
      </div>
    </div>
  );
}
