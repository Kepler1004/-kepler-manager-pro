'use client';
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase-browser';

export default function LoginPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setMsg('');
    const supabase = createClient();
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.assign(`/${locale}/dashboard`);
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) window.location.assign(`/${locale}/dashboard`);
        else setMsg(t('check_email'));
      }
    } catch (e: any) {
      setMsg(e.message ?? 'Error');
    } finally { setBusy(false); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold">Kepler Manager Pro</h1>
        <p className="mb-6 text-sm text-slate-500">
          {mode === 'signin' ? t('signin') : t('signup')}
        </p>
        <div className="space-y-3">
          <input type="email" placeholder={t('email')} value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <input type="password" placeholder={t('password')} value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button disabled={busy || !email || !password} onClick={submit}
            className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
            {mode === 'signin' ? t('signin') : t('signup')}
          </button>
        </div>
        {msg && <p className="mt-3 text-sm text-rose-600">{msg}</p>}
        <button
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMsg(''); }}
          className="mt-4 text-sm text-indigo-600 hover:underline">
          {mode === 'signin' ? t('to_signup') : t('to_signin')}
        </button>
      </div>
    </div>
  );
}
