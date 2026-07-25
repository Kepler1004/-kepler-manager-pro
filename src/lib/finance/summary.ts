import { createClient } from '@/lib/supabase-server';

export interface FinanceSummary {
  year: number; month: number;
  income: number;           // 청구한 전체 고지서 합계
  payrollExpense: number;   // payslips.net_pay 합산
  manualExpense: number;    // expenses 합산
  expenseByCategory: Record<string, number>;
  totalExpense: number;
  profit: number;           // income - totalExpense
  margin: number;           // profit / income (0~1)
  invoiceCount: number;
  paidIncome: number;       // 참고: 납부완료분만
}

export async function getFinanceSummary(year: number, month: number): Promise<FinanceSummary> {
  const db = await createClient();

  const { data: invs } = await db
    .from('invoices').select('total, status')
    .eq('period_year', year).eq('period_month', month);
  const income = (invs ?? []).reduce((s, r: any) => s + Number(r.total || 0), 0);
  const paidIncome = (invs ?? [])
    .filter((r: any) => r.status === 'paid')
    .reduce((s, r: any) => s + Number(r.total || 0), 0);

  const { data: slips } = await db
    .from('payslips').select('net_pay')
    .eq('period_year', year).eq('period_month', month);
  const payrollExpense = (slips ?? []).reduce((s, r: any) => s + Number(r.net_pay || 0), 0);

  const { data: exps } = await db
    .from('expenses').select('category, amount')
    .eq('period_year', year).eq('period_month', month);
  const expenseByCategory: Record<string, number> = {};
  let manualExpense = 0;
  for (const e of exps ?? []) {
    const amt = Number((e as any).amount || 0);
    manualExpense += amt;
    const c = (e as any).category || 'etc';
    expenseByCategory[c] = (expenseByCategory[c] || 0) + amt;
  }
  expenseByCategory['payroll'] = payrollExpense;

  const totalExpense = payrollExpense + manualExpense;
  const profit = income - totalExpense;
  const margin = income > 0 ? profit / income : 0;

  return {
    year, month, income, payrollExpense, manualExpense, expenseByCategory,
    totalExpense, profit, margin, invoiceCount: (invs ?? []).length, paidIncome,
  };
}
