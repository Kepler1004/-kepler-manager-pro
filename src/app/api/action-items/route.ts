// src/app/api/action-items/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/guards';
import { reportServerClient } from '@/lib/report/supabase';

const STAFF = ['master', 'admin', 'admin_b'];

// 회의 업무 등록 → 담당자의 tasks 리스트에 자동 편입
// (WhatsApp 푸시는 후속 단계에서 pushed_at 채우며 연결)
export async function POST(req: NextRequest) {
  const me = await getCurrentProfile();
  if (!me || !STAFF.includes(me.role)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const body = await req.json();
  const sb = await reportServerClient();

  const bucket = body.target_bucket === 'added' ? 'added' : 'plan';
  const taskDate =
    bucket === 'added'
      ? new Date().toISOString().slice(0, 10)
      : new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  // 1) 담당자 tasks 생성
  const { data: task, error: tErr } = await sb
    .from('tasks')
    .insert({
      staff_id: body.assignee_id,
      task_date: taskDate,
      bucket,
      title: body.title,
      tag: body.tag ?? 'planning',
      deadline: body.deadline ?? null,
      source: 'meeting',
    })
    .select()
    .single();
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 400 });

  // 2) 액션아이템 기록
  const { data: item, error: aErr } = await sb
    .from('meeting_action_items')
    .insert({
      title: body.title,
      assignee_id: body.assignee_id,
      created_by: me.id,
      deadline: body.deadline ?? null,
      target_bucket: bucket,
      linked_task_id: task.id,
      status: 'assigned',
    })
    .select()
    .single();
  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 400 });

  return NextResponse.json({ item, task });
}

export async function GET() {
  const me = await getCurrentProfile();
  if (!me) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const sb = await reportServerClient();
  const { data } = await sb
    .from('meeting_action_items')
    .select('*')
    .order('deadline', { ascending: true, nullsFirst: false });
  return NextResponse.json({ items: data ?? [] });
}
