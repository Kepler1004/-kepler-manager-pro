'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegenInvoiceButton({
  invoiceId, studentId, year, month, label = '갱신', className,
}: {
  invoiceId?: string;
  studentId?: string; year?: number; month?: number;
  label?: string; className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function run() {
    setBusy(true);
    try {
      const payload = invoiceId ? { invoiceId } : { studentId, year, month };
      const res = await fetch('/api/invoices/generate-one', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) { alert(json.error ?? '갱신 실패'); return; }
      if (json.skipped) { alert('수강 중인 과목이 없어 고지서를 만들 수 없어요.'); return; }
      router.refresh();
    } catch (e: any) {
      alert(e?.message ?? '갱신 실패');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={run} disabled={busy}
      className={className ?? 'rounded-md border border-indigo-300 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50'}>
      {busy ? '...' : label}
    </button>
  );
}
