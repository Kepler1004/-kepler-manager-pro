import type { SupabaseClient } from '@supabase/supabase-js';

export async function recomputeInvoiceTotal(
  supabase: SupabaseClient,
  invoiceId: string
): Promise<number> {
  const { data: items } = await supabase
    .from('invoice_items').select('amount').eq('invoice_id', invoiceId);
  const { data: adjs } = await supabase
    .from('invoice_adjustments').select('amount').eq('invoice_id', invoiceId);

  const itemsSum = (items ?? []).reduce((s, r: any) => s + Number(r.amount || 0), 0);
  const adjSum = (adjs ?? []).reduce((s, r: any) => s + Number(r.amount || 0), 0);
  const total = itemsSum + adjSum;

  await supabase.from('invoices').update({ total }).eq('id', invoiceId);
  return total;
}
