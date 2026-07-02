import { requireSection } from '@/lib/guards';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
export default async function Page() {
  await requireSection('pricing');
  const t = await getTranslations();
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">{t('nav.pricing')}</h1>
      <p className="text-slate-500">
        수업별 1회 단가(요구사항 8)는 <Link href="/classes" className="text-indigo-600 underline">수업/시간표</Link> 화면에서
        각 수업의 “1회 단가(학생)”로 편집합니다.
      </p>
    </div>
  );
}
