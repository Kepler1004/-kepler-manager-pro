import { getCurrentProfile } from '@/lib/guards';
import { getReportsByDate, getImminentTasks } from '@/lib/report/queries';
import { StaffColumn } from './StaffColumn';
import { DeadlineAlertBar } from './DeadlineAlertBar';
import { ActionItemComposer } from './ActionItemComposer';
import { ParticipantManager } from './ParticipantManager';

const STAFF = ['master', 'admin', 'admin_b'];

export async function DailyReportBoard() {
  const me = await getCurrentProfile();
  if (!me || !STAFF.includes(me.role)) return null;

  const today = new Date().toISOString().slice(0, 10);
  const [reports, imminent] = await Promise.all([getReportsByDate(today), getImminentTasks()]);
  const staffLite = reports.map((r) => r.staff);

  return (
    <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">일일 업무 현황</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{today}</span>
          <ParticipantManager />
          <ActionItemComposer staff={staffLite} />
        </div>
      </div>

      <DeadlineAlertBar items={imminent} />

      <div className="flex gap-3 overflow-x-auto pb-2">
        {reports.length === 0 ? (
          <p className="text-sm text-gray-400">업무 보고 대상이 없습니다. 우측 상단 [대상 관리]에서 지정하세요.</p>
        ) : (
          reports.map((r) => <StaffColumn key={r.staff.id} report={r} />)
        )}
      </div>
    </section>
  );
}
