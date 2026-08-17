// src/app/api/daily-report/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/guards';
import { reportServerClient } from '@/lib/report/supabase';
import { localToday } from '@/lib/report/types';

type Bucket = 'done' | 'added' | 'hold' | 'plan';
const BUCKETS: Bucket[] = ['done', 'added', 'hold', 'plan'];

// 오늘자 내 보고 상태 + 이미 입력한 항목 조회 (새로고침 시 복원용)
export async function GET() {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const sb = await reportServerClient();
  const today = localToday();

  const { data: report } = await sb
    .from('daily_reports')
    .select('*')
    .eq('staff_id', me.id)
    .eq('report_date', today)
    .maybeSingle();

  const { data: tasks } = await sb
    .from('tasks')
    .select('*')
    .eq('staff_id', me.id)
    .eq('task_date', today)
    .eq('source', 'manual');

  return NextResponse.json({ report: report ?? null, tasks: tasks ?? [] });
}

// 오늘자 업무 보고 제출 (본인만, RLS의 staff_id = auth.uid() 조건으로 자연스럽게 보호됨)
export async function POST(req: NextRequest) {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const today = localToday();
  const sb = await reportServerClient();

  // 이미 제출 완료된 상태면 중복 제출 방지
  const { data: existing } = await sb
    .from('daily_reports')
    .select('id, status')
    .eq('staff_id', me.id)
    .eq('report_date', today)
    .maybeSingle();

  if (existing?.status === 'submitted') {
    return NextResponse.json({ error: 'ALREADY_SUBMITTED' }, { status: 409 });
  }

  // rollover 크론이 미리 만들어둔 daily_reports 행을 submitted로 갱신 (없으면 새로 생성)
  const { data: upserted, error: drErr } = await sb
    .from('daily_reports')
    .upsert(
      {
        staff_id: me.id,
        report_date: today,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'staff_id,report_date' }
    )
    .select()
    .single();

  if (drErr) return NextResponse.json({ error: drErr.message }, { status: 400 });

  const rows: Record<string, unknown>[] = [];
  for (const bucket of BUCKETS) {
    const items = Array.isArray(body[bucket]) ? body[bucket] : [];
    for (const item of items) {
      const title = String(item?.title ?? '').trim();
      if (!title) continue;
      rows.push({
        staff_id: me.id,
        report_id: upserted.id,
        task_date: today,
        bucket,
        title,
        tag: 'etc',
        hold_reason: bucket === 'hold' ? String(item?.reason ?? '').trim() || null : null,
        source: 'manual',
      });
    }
  }

  if (rows.length > 0) {
    const { error: tErr } = await sb.from('tasks').insert(rows);
    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, report: upserted });
}
