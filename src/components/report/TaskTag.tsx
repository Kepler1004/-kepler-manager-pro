'use client';
import { useTranslations } from 'next-intl';
import { TAG_STYLE, TAG_KEY, type TaskTag as TT } from '@/lib/report/types';

export function TaskTag({ tag }: { tag: TT }) {
  const t = useTranslations('report');
  const s = TAG_STYLE[tag];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${s.chip}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {t(TAG_KEY[tag])}
    </span>
  );
}
