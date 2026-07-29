'use client';
import { useState } from 'react';
import RegenInvoiceButton from './RegenInvoiceButton';

export default function StudentInvoiceRegen({ studentId }: { studentId: string }) {
  const now = new Date();
  const def = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const [year, setYear] = useState(def.getFullYear());
  const [month, setMonth] = useState(def.getMonth() + 1);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
      <span className="text-sm text-slate-500">원비</span>
      <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))}
        className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm" />
      <input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))}
        className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm" />
      <RegenInvoiceButton studentId={studentId} year={year} month={month} label="이 학생 원비 생성/갱신"
        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50" />
    </div>
  );
}
