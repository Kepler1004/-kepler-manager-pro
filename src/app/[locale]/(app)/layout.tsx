import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import SignOutButton from '@/components/SignOutButton';
import { getCurrentProfile, canAccess } from '@/lib/guards';

// 수업료 단가/선생님 급여는 메뉴에서 숨김(수업 관리 폼에서 편집)
const NAV = [
  ['dashboard', '/dashboard'], ['students', '/students'], ['classes', '/classes'],
  ['timetable', '/timetable'], ['absences', '/absences'], ['holidays', '/holidays'],
  ['invoices', '/invoices'], ['finance', '/finance'], ['payslips', '/payslips'], ['vacations', '/vacations'],
  ['admins', '/admins'],
] as const;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations();
  const me = await getCurrentProfile();
  const role = me?.role ?? 'teacher';
  const nav = NAV.filter(([key]) => canAccess(role, key));
  const englishProUrl = process.env.NEXT_PUBLIC_ENGLISH_PRO_URL ?? '#';
  const mathProUrl = process.env.NEXT_PUBLIC_MATH_PRO_URL ?? '#';
  const campProUrl = process.env.NEXT_PUBLIC_CAMP_PRO_URL ?? 'https://kepler-edu.com';

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-slate-200 bg-white p-4">
        <div className="mb-6">
          <div className="text-lg font-bold">{t('app.title')}</div>
          <div className="text-xs text-slate-500">{t('app.subtitle')}</div>
        </div>
        <nav className="space-y-1">
          {nav.map(([key, href]) => (
            <Link key={key} href={href} className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
              {t(`nav.${key}`)}
            </Link>
          ))}
        </nav>
        <div className="mt-6 space-y-2 border-t border-slate-200 pt-4">
          <a href={englishProUrl} target="_blank" rel="noreferrer"
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700">{t('nav.english_pro')}</a>
          <a href={mathProUrl} target="_blank" rel="noreferrer"
            className="block rounded-md bg-emerald-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-emerald-700">{t('nav.math_pro')}</a>
          <a href={campProUrl} target="_blank" rel="noreferrer"
            className="block rounded-md bg-amber-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-amber-700">{t('nav.camp_pro')}</a>
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-end gap-4 border-b border-slate-200 bg-white px-6 py-3">
          {me?.email && <span className="text-sm text-slate-500">{me.email}</span>}
          <LanguageSwitcher />
          <SignOutButton />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
