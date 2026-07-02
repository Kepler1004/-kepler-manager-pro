import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import SignOutButton from '@/components/SignOutButton';
import { createClient } from '@/lib/supabase-server';

const NAV = [
  ['dashboard', '/dashboard'], ['students', '/students'], ['classes', '/classes'],
  ['timetable', '/timetable'], ['pricing', '/pricing'], ['salaries', '/salaries'],
  ['absences', '/absences'], ['holidays', '/holidays'], ['invoices', '/invoices'],
  ['payslips', '/payslips'], ['admins', '/admins'],
] as const;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations();
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  const englishProUrl = process.env.NEXT_PUBLIC_ENGLISH_PRO_URL ?? '#';
  const mathProUrl = process.env.NEXT_PUBLIC_MATH_PRO_URL ?? '#';
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-slate-200 bg-white p-4">
        <div className="mb-6">
          <div className="text-lg font-bold">{t('app.title')}</div>
          <div className="text-xs text-slate-500">{t('app.subtitle')}</div>
        </div>
        <nav className="space-y-1">
          {NAV.map(([key, href]) => (
            <Link key={key} href={href} className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
              {t(`nav.${key}`)}
            </Link>
          ))}
        </nav>
        <div className="mt-6 space-y-2 border-t border-slate-200 pt-4">
          <a href={englishProUrl} target="_blank" rel="noreferrer" className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700">{t('nav.english_pro')}</a>
          <a href={mathProUrl} target="_blank" rel="noreferrer" className="block rounded-md bg-emerald-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-emerald-700">{t('nav.math_pro')}</a>
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-end gap-4 border-b border-slate-200 bg-white px-6 py-3">
          {user?.email && <span className="text-sm text-slate-500">{user.email}</span>}
          <LanguageSwitcher />
          <SignOutButton />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
