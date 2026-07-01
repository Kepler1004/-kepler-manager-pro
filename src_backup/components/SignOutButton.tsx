'use client';
import { useLocale, useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase-browser';

export default function SignOutButton() {
  const t = useTranslations('nav');
  const locale = useLocale();
  async function out() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign(`/${locale}/login`);
  }
  return (
    <button onClick={out} className="text-sm text-slate-500 hover:text-slate-900">
      {t('logout')}
    </button>
  );
}
