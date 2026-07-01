import { getTranslations } from 'next-intl/server';
export default async function Page() {
  const t = await getTranslations();
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">{t('nav.payslips')}</h1>
      <p className="text-slate-500">지난달 급여 명세서 생성·발송 (요구사항 10).</p>
      <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">
        곧 실제 입력 화면으로 연결됩니다. (테이블/RLS는 이미 준비됨)
      </div>
    </div>
  );
}
