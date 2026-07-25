'use client';
import { useRouter } from '@/i18n/routing';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { addExpense, deleteExpense } from './actions';

const CATS = ['electricity', 'water', 'internet', 'water_purifier', 'stationery', 'etc'];

export default function FinanceClient({ summary, expenses, year, month }: any) {
  const t = useTranslations();
  const router = useRouter();
  const [y, setY] = useState(year);
  const [m, setM] = useState(month);
  const RM = (n: number) => `RM ${Number(n).toFixed(2)}`;
  const catLabel = (c: string) => t(`finance.cat_${c}`);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-2">
        <h1 className="mr-4 text-2xl font-bold">{t('finance.title')}</h1>
        <input type="number" value={y} onChange={(e) => setY(Number(e.target.value))}
          className="w-24 rounded-md border border-slate-300 px-2 py-2 text-sm" />
        <input type="number" min={1} max={12} value={m} onChange={(e) => setM(Number(e.target.value))}
          className="w-16 rounded-md border border-slate-300 px-2 py-2 text-sm" />
        <button onClick={() => router.push(`/finance?year=${y}&month=${m}`)}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white">{t('common.view')}</button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">{t('finance.income')}</p>
          <p className="mt-1 text-xl font-bold">{RM(summary.income)}</p>
          <p className="text-[11px] text-slate-400">{t('finance.paid_income')}: {RM(summary.paidIncome)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">{t('finance.total_expense')}</p>
          <p className="mt-1 text-xl font-bold">{RM(summary.totalExpense)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">{t('finance.profit')}</p>
          <p className={`mt-1 text-xl font-bold ${summary.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{RM(summary.profit)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">{t('finance.margin')}</p>
          <p className={`mt-1 text-xl font-bold ${summary.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{(summary.margin * 100).toFixed(1)}%</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">{t('finance.expense_breakdown')}</h2>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between border-b border-slate-100 py-1">
            <span>{t('finance.cat_payroll')} <span className="text-xs text-slate-400">({t('finance.auto')})</span></span>
            <span>{RM(summary.payrollExpense)}</span>
          </div>
          {CATS.map((c) => (
            <div key={c} className="flex justify-between border-b border-slate-100 py-1">
              <span>{catLabel(c)}</span>
              <span>{RM(summary.expenseByCategory[c] ?? 0)}</span>
            </div>
          ))}
          <div className="flex justify-between pt-2 font-bold">
            <span>{t('finance.total_expense')}</span><span>{RM(summary.totalExpense)}</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">{t('finance.expense_list')}</h2>
        <form action={addExpense} className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="month" value={month} />
          <select name="category" className="rounded border border-slate-300 px-2 py-1 text-sm">
            {CATS.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
          </select>
          <input name="label" placeholder={t('finance.memo')} className="rounded border border-slate-300 px-2 py-1 text-sm sm:col-span-2" />
          <input name="amount" type="number" step="0.01" placeholder="RM" required className="rounded border border-slate-300 px-2 py-1 text-sm" />
          <button className="rounded bg-indigo-600 px-3 py-1 text-sm text-white">{t('common.add')}</button>
        </form>
        <table className="w-full text-sm">
          <tbody>
            {expenses.length === 0 && <tr><td className="py-4 text-center text-slate-400">{t('finance.no_expense')}</td></tr>}
            {expenses.map((e: any) => (
              <tr key={e.id} className="border-t border-slate-100">
                <td className="py-2">{catLabel(e.category)}</td>
                <td className="py-2 text-slate-500">{e.label}</td>
                <td className="py-2 text-right">{RM(e.amount)}</td>
                <td className="py-2 text-right">
                  <form action={deleteExpense} className="inline">
                    <input type="hidden" name="id" value={e.id} />
                    <button className="text-xs text-rose-600">{t('common.delete')}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
