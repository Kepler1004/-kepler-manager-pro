import { getTranslations } from 'next-intl/server';
import { getCurrentProfile } from '@/lib/guards';
import { getReportsByDate, getImminentTasks } from '@/lib/report/queries';
import { localToday } from '@/lib/report/types';
import { StaffColumn } from './StaffColumn';
import { DeadlineAlertBar } from './DeadlineAlertBar';
import { ActionItemComposer } from './ActionItemComposer';
import { ParticipantManager } from './ParticipantManager';

const STAFF = ['master', 'admin', 'admin_b'];

export async function DailyReportBoard() {
  const me = await getCurrentProfile();
  if (!me || !STAFF.includes(me.role)) return null;

  const t = await getTranslations('report');
  const today = localToday();
  const [reports, imminent] = await Promise.all([getReportsByDate(today), getImminentTasks()]);
  const staffLite = reports.map((r) => r.staff);

  return (
    <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">{t('title')}</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{today}</span>
          <ParticipantManager />
          <ActionItemComposer staff={staffLite} />
        </div>
      </div>
      <DeadlineAlertBar items={imminent} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {reports.length === 0 ? (
          <p className="text-sm text-gray-400">{t('empty')}</p>
        ) : (
          reports.map((r) => <StaffColumn key={r.staff.id} report={r} />)
        )}
      </div>
    </section>
  );
}
