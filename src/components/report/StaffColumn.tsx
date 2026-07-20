// src/components/report/StaffColumn.tsx
import { TaskCard } from './TaskCard';
import { BUCKET_LABEL, type StaffReport, type TaskBucket } from '@/lib/report/types';

const ROLE_LABEL: Record<string, string> = {
  master: '마스터',
  admin: '관리자A',
  admin_b: '관리자B',
  teacher: '선생님',
};

const ORDER: TaskBucket[] = ['done', 'added', 'hold', 'plan'];

export function StaffColumn({ report }: { report: StaffReport }) {
  const grouped = (b: TaskBucket) => report.tasks.filter((t) => t.bucket === b);

  return (
    <div className="flex min-w-[240px] flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-800">{report.staff.full_name}</span>
        <span className="rounded bg-gray-200 px-2 py-0.5 text-[11px] text-gray-600">
          {ROLE_LABEL[report.staff.role] ?? report.staff.role}
        </span>
      </div>

      {ORDER.map((b) => {
        const items = grouped(b);
        return (
          <div key={b}>
            <p className="mb-1 text-xs font-medium text-gray-500">{BUCKET_LABEL[b]}</p>
            {items.length === 0 ? (
              <p className="text-[11px] text-gray-300">—</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {items.map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
