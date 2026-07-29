import { NextRequest, NextResponse } from 'next/server';
import { generateInvoiceForStudent } from '@/lib/invoice-service';
import { getCurrentProfile } from '@/lib/guards';

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || !['master', 'admin', 'admin_b'].includes(profile.role))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { studentId, year, month } = await req.json();
  if (!studentId || !year || !month)
    return NextResponse.json({ error: 'studentId, year, month required' }, { status: 400 });

  try {
    const result = await generateInvoiceForStudent(studentId, Number(year), Number(month));
    if (!result) return NextResponse.json({ ok: true, skipped: 'no_active_classes' });
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'error' }, { status: 400 });
  }
}
