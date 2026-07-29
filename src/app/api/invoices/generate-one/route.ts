import { NextRequest, NextResponse } from 'next/server';
import { generateInvoiceForStudent } from '@/lib/invoice-service';
import { getCurrentProfile } from '@/lib/guards';
import { createAdminClient } from '@/lib/supabase-admin';

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile || !['master', 'admin', 'admin_b'].includes(profile.role))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json();
  let studentId = body.studentId as string | undefined;
  let year = body.year as number | undefined;
  let month = body.month as number | undefined;
  const invoiceId = body.invoiceId as string | undefined;

  if (invoiceId && (!studentId || !year || !month)) {
    const db = createAdminClient();
    const { data: inv, error } = await db
      .from('invoices')
      .select('student_id, period_year, period_month')
      .eq('id', invoiceId).single();
    if (error || !inv) return NextResponse.json({ error: 'invoice_not_found' }, { status: 404 });
    studentId = inv.student_id; year = inv.period_year; month = inv.period_month;
  }

  if (!studentId || !year || !month)
    return NextResponse.json({ error: 'studentId+year+month or invoiceId required' }, { status: 400 });

  try {
    const result = await generateInvoiceForStudent(studentId, Number(year), Number(month));
    if (!result) return NextResponse.json({ ok: true, skipped: 'no_active_classes' });
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'error' }, { status: 400 });
  }
}
