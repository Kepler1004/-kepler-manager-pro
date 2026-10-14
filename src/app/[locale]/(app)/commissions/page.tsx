import { requireSection } from '@/lib/guards';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase-server';
import { commissionForCounselor, COUNSELOR_COLS, type CounselorProfile } from '@/lib/commission-service';
import { todayMY, type CommissionStudentLine } from '@/lib/commission';

const GRID = 'grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1.2fr_1fr] items-center gap-2';

export default async function CommissionsPage({ searchParams }: { searchParams: Promise<{ y?: string; m?: string }> }) {
  await requireSection('commissions');
  const t = await getTranslations('commission');
  const sp = await searchParams;
  const [ty, tm] = todayMY().split('-').map(Number);
  const yIn = Number(sp.y), mIn = Number(sp.m);
  const year = Number.isInteger(yIn) && yIn >= 2000 && yIn <= 2100 ? yIn : ty;
  const month = Number.isInteger(mIn) && mIn >= 1 && mIn <= 12 ? mIn : tm;

  const db = await createClient();
  const { data: counselors } = await db.from('profiles')
    .select(`${COUNSELOR_COLS}, is_active`).eq('is_counselor', true).order('full_name');

  const rows = await Promise.all((counselors ?? []).map(async (p: any) => ({
    p: p as CounselorProfile & { is_active: boolean },
    r: await commissionForCounselor(db, p as CounselorProfile, year, month),
  })));

  const fmt = (n: number) => `RM ${Number(n).toFixed(2)}`;
  const grand = rows.reduce((a, x) => a + x.r.total, 0);
  const List = ({ title, items }: { title: string; items: CommissionStudentLine[] }) => (
    <div>
      <div className="mb-1 text-xs font-medium text-slate-500">{title} ({items.length})</div>
      {items.length === 0 ? <div className="text-xs text-slate-400">-</div> : (
        <ul className="space-y-0.5 text-xs">
          {items.map((x) => (
            <li key={`${x.id}-${x.date}`} className="flex justify-between gap-2">
              <span>{x.name} <span className="text-slate-400">· {x.date}{title === t('retention') ? ` · ${x.programType === 'international' ? t('intl') : t('local')}` : ''}</span></span>
              <span>{fmt(x.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      <form method="get" className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-4">
        <input name="y" type="number" defaultValue={year} className="w-24 rounded-md border border-slate-300 px-2 py-2 text-sm" />
        <input name="m" type="number" min={1} max={12} defaultValue={month} className="w-16 rounded-md border border-slate-300 px-2 py-2 text-sm" />
        <button className="rounded-md bg-slate-200 px-3 py-2 text-sm">{t('view')}</button>
        <div className="flex-1" />
        <p className="text-xs text-slate-500">{t('page_hint')}</p>
      </form>

      {rows.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">{t('no_counselors')}</div>
      )}

      {rows.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-normal" colSpan={7}>
                  <div className={GRID}>
                    <span>{t('counselor')}</span>
                    <span>{t('probation')}</span>
                    <span className="text-right">{t('new_intl')}</span>
                    <span className="text-right">{t('new_local')}</span>
                    <span className="text-right">{t('goal')}</span>
                    <span className="text-right">{t('retention')}</span>
                    <span className="text-right">{t('total')}</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, r }) => (
                <tr key={p.id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-2" colSpan={7}>
                    <details>
                      <summary className={`${GRID} cursor-pointer list-none`}>
                        <span className="font-medium text-indigo-600">{p.full_name || p.email}{p.is_active ? '' : ` (${t('inactive')})`}</span>
                        <span className="text-xs text-slate-500">
                          {!p.hire_date ? t('no_hire_date')
                            : r.inProbationWholeMonth ? t('in_probation', { date: r.probationEnd ?? '-' })
                            : t('probation_end', { date: r.probationEnd ?? '-' })}
                        </span>
                        <span className="text-right">{r.newIntl.length}</span>
                        <span className="text-right">{r.newLocal.length}</span>
                        <span className="text-right">{fmt(r.goalPay)}</span>
                        <span className="text-right">{r.retention.length} · {fmt(r.retentionPay)}</span>
                        <span className="text-right font-semibold">{fmt(r.total)}</span>
                      </summary>
                      <div className="mt-3 grid grid-cols-3 gap-4 rounded-lg bg-slate-50 p-3">
                        <List title={t('new_intl')} items={r.newIntl} />
                        <List title={t('new_local')} items={r.newLocal} />
                        <List title={t('retention')} items={r.retention} />
                        <div className="col-span-3 space-y-1 text-xs text-slate-600">
                          <div>{t('new_pay')}: {fmt(r.newPay)} · {t('goal_intl')}: {fmt(r.goalIntl)} · {t('goal_local')}: {fmt(r.goalLocal)}</div>
                          {r.excludedProbation > 0 && <div className="text-slate-400">{t('excluded_probation', { n: r.excludedProbation })}</div>}
                          {r.missingProgramType.length > 0 && (
                            <div className="text-rose-600">{t('missing_type', { names: r.missingProgramType.map((x) => x.name).join(', ') })}</div>
                          )}
                        </div>
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-medium">
                <td className="px-4 py-2 text-right" colSpan={7}>{t('grand_total')}: {fmt(grand)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
