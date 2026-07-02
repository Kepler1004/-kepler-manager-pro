import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase-server';
import PrintButton from './print';

export default async function TimetablePage() {
  const t = await getTranslations();
  const db = await createClient();
  const [{ data: classes }, { data: teachers }, { data: subjects }, { data: enrollments }] = await Promise.all([
    db.from('classes').select('id, name, subject_id, teacher_id, day_of_week, days, start_time, end_time, room, is_active').eq('is_active', true),
    db.from('profiles').select('id, full_name, email'),
    db.from('subjects').select('id, name'),
    db.from('enrollments').select('class_id').eq('status', 'active'),
  ]);
  const teacherName = (id: string|null) => { const x=(teachers??[]).find((p:any)=>p.id===id); return x? (x.full_name||x.email):''; };
  const subjName = (id: string|null) => (subjects??[]).find((s:any)=>s.id===id)?.name ?? '';
  const days = [t('common.sun'),t('common.mon'),t('common.tue'),t('common.wed'),t('common.thu'),t('common.fri'),t('common.sat')];
  const countByClass: Record<string, number> = {};
  for (const e of enrollments ?? []) countByClass[e.class_id] = (countByClass[e.class_id] ?? 0) + 1;

  // 요일별 수업 그룹 (복수요일이면 각 요일에 표시)
  const byDay: Record<number, any[]> = {0:[],1:[],2:[],3:[],4:[],5:[],6:[]};
  for (const c of classes ?? []) {
    const ds: number[] = (c.days && c.days.length ? c.days : [c.day_of_week]);
    for (const d of ds) if (byDay[d]) byDay[d].push(c);
  }
  for (const d of Object.keys(byDay)) byDay[+d].sort((a,b)=>String(a.start_time).localeCompare(String(b.start_time)));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('nav.timetable')}</h1>
        <PrintButton />
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white print-area">
        <div className="grid grid-cols-7 divide-x divide-slate-200 min-w-[900px]">
          {days.map((dLabel, d) => (
            <div key={d} className="min-h-[300px]">
              <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm font-semibold">{dLabel}</div>
              <div className="space-y-2 p-2">
                {byDay[d].length === 0 && <div className="px-1 py-2 text-center text-xs text-slate-300">-</div>}
                {byDay[d].map((c) => {
                  const cnt = countByClass[c.id] ?? 0;
                  const empty = cnt === 0;
                  return (
                    <div key={c.id} className={empty ? 'rounded-lg border border-pink-200 bg-pink-50 p-2 text-xs' : 'rounded-lg border border-indigo-100 bg-indigo-50 p-2 text-xs'}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{c.name}</span>
                        <span className={empty ? 'rounded-full bg-pink-200 px-1.5 text-[10px] text-pink-700' : 'rounded-full bg-indigo-200 px-1.5 text-[10px] text-indigo-700'}>{cnt}{t('timetable.students_unit')}</span>
                      </div>
                      <div className="text-slate-500">{String(c.start_time).slice(0,5)}–{String(c.end_time).slice(0,5)}</div>
                      <div className="text-slate-500">{teacherName(c.teacher_id)}{c.room ? ` · ${c.room}` : ''}</div>
                      {subjName(c.subject_id) && <div className="text-indigo-400">{subjName(c.subject_id)}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`@media print { aside, header { display: none !important; } main { padding: 0 !important; } .print-area { border: none; } @page { size: landscape; } }`}</style>
    </div>
  );
}
