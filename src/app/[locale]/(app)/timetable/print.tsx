'use client';
import { useTranslations } from 'next-intl';
export default function PrintButton() {
  const t = useTranslations('timetable');
  return (
    <button onClick={() => window.print()} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
      {t('print')}
    </button>
  );
}
