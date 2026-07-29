import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * 고지서 총액 재계산 (수동조정 경로).
 * total = 수업료합(invoice_items)
 *         - 할인금액(수업료합 × discount_rate/100)
 *         + 등록비 + 교재비
 *         + 수동조정합(invoice_adjustments)
 * 계산된 할인금액은 discount_amount 컬럼에도 저장해 화면/PDF에서 재사용.
 */
export async function recomputeInvoiceTotal(
  supabase: SupabaseClient,
  invoiceId: string
): Promise<number> {
  const { data: items } = await supabase
    .from('invoice_items').select('amount').eq('invoice_id', invoiceId);
  const { data: adjs } = await supabase
    .from('invoice_adjustments').select('amount').eq('invoice_id', invoiceId);
  const { data: inv } = await supabase
    .from('invoices')
    .select('discount_rate, registration_fee, textbook_fee')
    .eq('id', invoiceId)
    .single();

  const itemsSum = (items ?? []).reduce((s, r: any) => s + Number(r.amount || 0), 0);
  const adjSum = (adjs ?? []).reduce((s, r: any) => s + Number(r.amount || 0), 0);

  const rawRate = Number(inv?.discount_rate || 0);
  const discountRate = rawRate < 0 ? 0 : rawRate > 100 ? 100 : rawRate;
  const registrationFee = Number(inv?.registration_fee || 0);
  const textbookFee = Number(inv?.textbook_fee || 0);
  const discountAmount = round2(itemsSum * (discountRate / 100));

  const total = round2(
    itemsSum - discountAmount + registrationFee + textbookFee + adjSum
  );

  await supabase
    .from('invoices')
    .update({ discount_amount: discountAmount, total })
    .eq('id', invoiceId);
  return total;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
