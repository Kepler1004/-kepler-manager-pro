'use client';
import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase-browser';

type Hit = {
  id: string; name: string; name_en: string | null; school: string | null; grade: string | null;
  enrollments: { status: string; classes: { name: string; subject_id: string | null } | null }[] | null;
};

export default function StudentSearch() {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);

  useEffect(() => {
    const term = q.trim();
    if (!term) { setHits([]); return; }
    let active = true;
    const id = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase.from('students')
        .select('id, name, name_en, school, grade, enrollments(status, classes(name, subject_id))')
        .or(`name.ilike.%${term}%,name_en.ilike.%${term}%`)
        .limit(8);
      if (active) setHits((data ?? []) as any);
    }, 200);
    return () => { active = false; clearTimeout(id); };
  }, [q]);

  const activeClasses = (h: Hit) =>
    (h.enrollments ?? [])
      .filter((e) => e.status === 'active' && e.classes)
      .map((e) => e.classes!.name);

  return (
    <div className="relative mb-6 max-w-lg">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search_student')}
        className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm" />
      {hits.length > 0 && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow">
          {hits.map((h) => {
            const classes = activeClasses(h);
            return (
              <a key={h.id} href={`/${locale}/students/${h.id}`}
                className="block border-b border-slate-50 px-4 py-2 last:border-0 hover:bg-slate-50">
                <div className="text-sm font-medium text-slate-800">
                  {h.name}{h.name_en ? ` (${h.name_en})` : ''}
                  {(h.school || h.grade) && (
                    <span className="text-slate-400"> · {[h.school, h.grade].filter(Boolean).join(' ')}</span>
                  )}
                </div>
                {classes.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {classes.map((c, i) => (
                      <span key={i} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-600">{c}</span>
                    ))}
                  </div>
                ) : (
                  <div className="mt-1 text-[11px] text-slate-400">{t('no_enrollment')}</div>
                )}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
