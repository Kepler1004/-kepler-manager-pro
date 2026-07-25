import { requireSection } from '@/lib/guards';
import { createClient } from '@/lib/supabase-server';
import { getFinanceSummary } from '@/lib/finance/summary';
import FinanceClient from './ui';

export default async function FinancePage({
  searchParams,
}: { searchParams: Promise<{ year?: string; month?: string }> }) {
  await requireSection('finance');
  const sp = await searchParams;
  const now = new Date();
  const year = Number(sp.year) || now.getFullYear();
  const month = Number(sp.month) || now.getMonth() + 1;

  const summary = await getFinanceSummary(year, month);

  const db = await createClient();
  const { data: expenses } = await db
    .from('expenses').select('*')
    .eq('period_year', year).eq('period_month', month)
    .order('created_at', { ascending: true });

  return <FinanceClient summary={summary} expenses={expenses ?? []} year={year} month={month} />;
}
