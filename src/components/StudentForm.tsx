'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createStudent, updateStudent } from '@/app/[locale]/(app)/students/actions';

export interface StudentRow {
  id?: string; name?: string; name_en?: string | null; school?: string | null;
  grade?: string | null; guardian_name?: string | null; guardian_email?: string;
  phone?: string | null; status?: string | null;
}

export default function StudentForm({ initial, onDone }: { initial?: StudentRow; onDone?: () => void }) {
  const t = useTranslations('student');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const isEdit = !!initial?.id;

  async function action(formData: FormData) {
    setBusy(true); setErr('');
    try {
      if (isEdit) await updateStudent(formData);
      else await createStudent(formData);
      onDone?.();
    } catch (e: any) { setErr(e.message ?? 'Error'); }
    finally { setBusy(false); }
  }

  const Field = ({ name, label, type = 'text', required = false, defaultValue = '' }:
    { name: string; label: string; type?: string; required?: boolean; defaultValue?: string }) => (
    <label className="block">
      <span className="mb-1 block text-xs text-slate-500">{label}{required && ' *'}</span>
      <input name={name} type={type} required={required} defaultValue={defaultValue}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
    </label>
  );

  return (
    <form action={action} className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-4">
      {isEdit && <input type="hidden" name="id" defaultValue={initial!.id} />}
      <Field name="name" label={t('name')} required defaultValue={initial?.name ?? ''} />
      <Field name="name_en" label={t('name_en')} defaultValue={initial?.name_en ?? ''} />
      <Field name="school" label={t('school')} defaultValue={initial?.school ?? ''} />
      <Field name="grade" label={t('grade')} defaultValue={initial?.grade ?? ''} />
      <Field name="guardian_name" label={t('guardian_name')} defaultValue={initial?.guardian_name ?? ''} />
      <Field name="guardian_email" label={t('guardian_email')} type="email" required defaultValue={initial?.guardian_email ?? ''} />
      <Field name="phone" label={t('phone')} defaultValue={initial?.phone ?? ''} />
      <label className="block">
        <span className="mb-1 block text-xs text-slate-500">{t('status')}</span>
        <select name="status" defaultValue={initial?.status ?? 'active'}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="active">{t('active')}</option>
          <option value="inactive">{t('inactive')}</option>
        </select>
      </label>
      <div className="col-span-2 flex items-center gap-3">
        <button disabled={busy}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {isEdit ? t('save') : t('add')}
        </button>
        {onDone && (
          <button type="button" onClick={onDone} className="text-sm text-slate-500">{t('cancel')}</button>
        )}
        {err && <span className="text-sm text-rose-600">{err}</span>}
      </div>
    </form>
  );
}
