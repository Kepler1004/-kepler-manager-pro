'use client';
import { addAdjustment, removeAdjustment, setInvoiceStatus } from './actions';

export function StatusToggle({ invoiceId, status }: { invoiceId: string; status: string }) {
  const paid = status === 'paid';
  return (
    <form action={setInvoiceStatus} className="inline">
      <input type="hidden" name="invoice_id" value={invoiceId} />
      <input type="hidden" name="status" value={paid ? 'unpaid' : 'paid'} />
      <button
        className={`rounded-full px-3 py-1 text-xs font-semibold ${
          paid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
        }`}
      >
        {paid ? '납부완료' : '미납'}
      </button>
    </form>
  );
}

export function AdjustmentRow({
  invoiceId, index, label, amount, currency,
}: { invoiceId: string; index: number; label: string; amount: number; currency: string }) {
  return (
    <div className="flex items-center justify-end gap-2 text-slate-500">
      <span>{label}: {currency} {Number(amount).toFixed(2)}</span>
      <form action={removeAdjustment} className="inline">
        <input type="hidden" name="invoice_id" value={invoiceId} />
        <input type="hidden" name="index" value={index} />
        <button className="text-xs text-slate-400 hover:text-rose-600">✕</button>
      </form>
    </div>
  );
}

export function AddAdjustment({ invoiceId }: { invoiceId: string }) {
  return (
    <form action={addAdjustment} className="mt-4 rounded-lg border border-slate-200 p-3">
      <p className="mb-2 text-xs font-semibold text-slate-600">조정 추가 (이월·차감)</p>
      <input name="invoice_id" type="hidden" value={invoiceId} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input name="label" required placeholder="사유 (예: 8월 강사결근 2회 차감)"
          className="rounded border border-slate-300 px-2 py-1 text-sm sm:col-span-2" />
        <input name="sessions" type="number" step="1" placeholder="회차 (예: -2)"
          className="rounded border border-slate-300 px-2 py-1 text-sm" />
        <input name="unit_price" type="number" step="0.01" placeholder="회차 단가 (예: 150)"
          className="rounded border border-slate-300 px-2 py-1 text-sm" />
        <input name="amount" type="number" step="0.01" placeholder="또는 금액 직접입력 (미납 이월은 +)"
          className="rounded border border-slate-300 px-2 py-1 text-sm sm:col-span-2" />
      </div>
      <p className="mt-1 text-[11px] text-slate-400">
        회차+단가를 넣으면 자동 계산됩니다. 차감은 회차를 음수로(예: -2), 미납 이월은 금액을 양수로 넣으세요.
      </p>
      <button className="mt-2 rounded bg-indigo-600 px-3 py-1 text-sm text-white">추가</button>
    </form>
  );
}
