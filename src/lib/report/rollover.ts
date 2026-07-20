// src/lib/report/rollover.ts
// 매일 새벽 실행: 전날 미완료(plan/hold) → 오늘 plan 으로 이월, 오늘자 보고 컨테이너 생성.
import { reportAdminClient } from './supabase';

export async function runRollover(refDate?: string) {
  const sb = reportAdminClient();
  const today = refDate ?? new Date().toISOString().slice(0, 10);
  const yesterday = new Date(new Date(today).getTime() - 86400000)
    .toISOString()
    .slice(0, 10);

  // 1) 어제 남은 항목(plan/hold) 조회
  const { data: leftovers } = await sb
    .from('tasks')
    .select('*')
    .eq('task_date', yesterday)
    .in('bucket', ['plan', 'hold']);

  let carried = 0;
  for (const t of leftovers ?? []) {
    // 이미 이월된 게 있으면 중복 방지
    const { data: dup } = await sb
      .from('tasks')
      .select('id')
      .eq('carried_from', t.id)
      .maybeSingle();
    if (dup) continue;

    await sb.from('tasks').insert({
      staff_id: t.staff_id,
      task_date: today,
      bucket: 'plan',
      title: t.title,
      tag: t.tag,
      deadline: t.deadline,
      carried_from: t.id,
      source: t.source,
    });
    carried++;
  }

  // 2) 활성 스태프별 오늘자 pending 보고 컨테이너 생성 (없으면)
  const { data: staff } = await sb
    .from('profiles')
    .select('id')
    .in('role', ['master', 'admin', 'admin_b', 'teacher'])
    .eq('is_active', true);

  let seeded = 0;
  for (const s of staff ?? []) {
    const { error } = await sb
      .from('daily_reports')
      .insert({ staff_id: s.id, report_date: today, status: 'pending' });
    if (!error) seeded++;
  }

  return { today, carried, seeded };
}
