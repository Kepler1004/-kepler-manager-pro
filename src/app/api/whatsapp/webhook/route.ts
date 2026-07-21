// src/app/api/whatsapp/webhook/route.ts
// Meta WhatsApp Cloud API webhook 수신점.
// GET: 최초 검증 핸드셰이크 / POST: 인바운드 메시지 수신
import { NextRequest, NextResponse } from 'next/server';
import { reportAdminClient } from '@/lib/report/whatsapp-store';

export const dynamic = 'force-dynamic';

// ── GET: Meta 검증 (hub.challenge 반환) ──
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

// ── POST: 인바운드 메시지 ──
export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: true }); }

  try {
    const entries = body?.entry ?? [];
    for (const entry of entries) {
      for (const change of entry?.changes ?? []) {
        const value = change?.value ?? {};
        const messages = value?.messages ?? [];
        for (const msg of messages) {
          const from = msg?.from;              // 보낸 사람 wa_id (예: 60198103659)
          const text =
            msg?.text?.body ??
            msg?.button?.text ??
            msg?.interactive?.button_reply?.title ??
            msg?.interactive?.list_reply?.title ??
            '';
          if (from) await storeInbound(from, text, msg);
        }
      }
    }
  } catch (e) {
    console.error('webhook parse error', e);
  }

  // Meta엔 항상 200을 빨리 반환해야 재전송이 안 됨
  return NextResponse.json({ ok: true });
}

// 들어온 메시지를 로그로 저장 (다음 단계에서 tasks 연결)
async function storeInbound(from: string, text: string, raw: any) {
  const sb = reportAdminClient();
  await sb.from('wa_inbound').insert({
    from_wa_id: from,
    text,
    raw,
  });
}
