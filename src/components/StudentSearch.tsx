'use client';
import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase-browser';

type Hit = { id: string; name: string; name_en: string | null; school: string | null };

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
        .select('id, name, name_en, school')
        .or(`name.ilike.%${term}%,name_en.ilike.%${term}%`)
        .limit(8);
      if (active) setHits(data ?? []);
    }, 200);
    return () => { active = false; clearTimeout(id); };
  }, [q]);

  return (
    <div className="relative mb-6 max-w-md">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search_student')}
        className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm" />
      {hits.length > 0 && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow">
          {hits.map((h) => (
            <a key={h.id} href={`/${locale}/students/${h.id}`}
              className="block px-4 py-2 text-sm hover:bg-slate-50">
              {h.name}{h.name_en ? ` (${h.name_en})` : ''}
              {h.school ? <span className="text-slate-400"> · {h.school}</span> : null}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
