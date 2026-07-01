'use client';
import { useRouter, usePathname } from '@/i18n/routing';
import { useLocale } from 'next-intl';

const LABELS: Record<string, string> = { en: 'English', ko: '한국어', zh: '中文' };

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  return (
    <select
      value={locale}
      onChange={(e) => router.replace(pathname, { locale: e.target.value })}
      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
      aria-label="Language"
    >
      {Object.entries(LABELS).map(([code, label]) => (
        <option key={code} value={code}>{label}</option>
      ))}
    </select>
  );
}
