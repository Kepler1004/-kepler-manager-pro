import { NextRequest, NextResponse } from 'next/server';
import { reportAdminClient } from '@/lib/report/whatsapp-store';
import { parseInbound } from '@/lib/report/parse-inbound';
import { localToday } from '@/lib/report/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const mode = p.get('hub.mode');
  const token = p.get('hub.verify_token');
  const challenge = p.get('hub.challenge');
  if (mode === 'subscribe' && token === process.env.WA_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? '', { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: true }); }

  try {
    for (const entry of body?.entry ?? []) {
      for (const change of entry?.changes ?? []) {
        const messages = change?.value?.messages ?? [];
        for (const msg of messages) {
          const from = msg?.from;
          const text =
            msg?.text?.body ??
            msg?.button?.text ??
            msg?.interactive?.button_reply?.title ??
            msg?.interactive?.list_reply?.title ?? '';
          if (from) await store(from, text, msg);
        }
      }
    }
  } catch (e) {
    console.error('webhook error', e);
  }
  return NextResponse.json({ ok: true });
}

async function store(from: string, text: string, raw: any) {
  const sb = reportAdminClient();

  // 1) 원문 로그
  await sb.from('wa_inbound').insert({ from_wa_id: from, text, raw });

  // 2) 번호로 직원 매칭 (profiles.whatsapp_number 기준)
  const { data: profile } = await sb
    .from('profiles')
    .select('id')
    .eq('whatsapp_number', from)
    .maybeSingle();
  if (!profile) return; // 매칭 안 되면 로그만 남기고 종료

  // 3) 파싱 → tasks 삽입
  const today = localToday();
  const parsed = parseInbound(text);
  for (const p of parsed) {
    await sb.from('tasks').insert({
      staff_id: profile.id,
      task_date: today,
      bucket: p.bucket,
      title: p.title,
      hold_reason: p.hold_reason,
      tag: p.tag,
      source: 'whatsapp',
    });
  }

  // 4) 당일 보고 제출 표시
  await sb.from('daily_reports')
    .upsert(
      { staff_id: profile.id, report_date: today, status: 'submitted', raw_text: text, submitted_at: new Date().toISOString() },
      { onConflict: 'staff_id,report_date' }
    );
}
