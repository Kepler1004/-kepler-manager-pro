'use client';
import { useTranslations } from 'next-intl';
import { TaskCard } from './TaskCard';
import { BUCKET_KEY, ROLE_KEY, type StaffReport, type TaskBucket } from '@/lib/report/types';

const ORDER: TaskBucket[] = ['done', 'added', 'hold', 'plan'];

export function StaffColumn({ report }: { report: StaffReport }) {
  const t = useTranslations('report');
  const grouped = (b: TaskBucket) => report.tasks.filter((x) => x.bucket === b);
  const name = report.staff.full_name || t('no_name');

  return (
    <div className="flex min-w-[240px] flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-800">{name}</span>
        <span className="rounded bg-gray-200 px-2 py-0.5 text-[11px] text-gray-600">
          {t(ROLE_KEY[report.staff.role] ?? 'role_teacher')}
        </span>
      </div>
      {ORDER.map((b) => {
        const items = grouped(b);
        return (
          <div key={b}>
            <p className="mb-1 text-xs font-medium text-gray-500">{t(BUCKET_KEY[b])}</p>
            {items.length === 0 ? (
              <p className="text-[11px] text-gray-300">—</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {items.map((x) => <TaskCard key={x.id} task={x} />)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
