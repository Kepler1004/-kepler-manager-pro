import { NextRequest, NextResponse } from 'next/server';
import { getCurrentProfile } from '@/lib/guards';
import { sendTemplate } from '@/lib/report/whatsapp';

const STAFF = ['master', 'admin', 'admin_b'];

export async function GET(req: NextRequest) {
  const me = await getCurrentProfile();
  if (!me || !STAFF.includes(me.role)) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  const to = req.nextUrl.searchParams.get('to');
  if (!to) return NextResponse.json({ error: 'to 파라미터 필요' }, { status: 400 });
  const result = await sendTemplate(to, 'hello_world', 'en_US');
  return NextResponse.json(result);
}
