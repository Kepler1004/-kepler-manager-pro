import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
export default async function Page() {
  const t = await getTranslations();
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">{t('nav.salaries')}</h1>
      <p className="text-slate-500">
        선생님×수업별 1회 급여(요구사항 9)는 <Link href="/classes" className="text-indigo-600 underline">수업/시간표</Link> 화면에서
        각 수업의 “선생님 1회 급여”로 편집합니다. 매월 1일 급여 명세서는 <Link href="/payslips" className="text-indigo-600 underline">급여 명세서</Link>에서 생성됩니다.
      </p>
    </div>
  );
}
