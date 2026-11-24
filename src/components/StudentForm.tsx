'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createStudent, updateStudent } from '@/app/[locale]/(app)/students/actions';

export interface StudentRow {
  id?: string; name?: string; name_en?: string | null; school?: string | null;
  grade?: string | null; guardian_name?: string | null; guardian_email?: string;
  phone?: string | null; status?: string | null;
  counselor_id?: string | null; program_type?: string | null; enrolled_date?: string | null;
  nationality?: string | null;
}
export interface CounselorOption { id: string; full_name: string | null; email: string | null; recruit_group?: string | null; }

export default function StudentForm({ initial, onDone, counselors = [] }:
  { initial?: StudentRow; onDone?: () => void; counselors?: CounselorOption[] }) {
  const t = useTranslations('student');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const isEdit = !!initial?.id;
  const [counselorId, setCounselorId] = useState(initial?.counselor_id ?? '');

  // 국적 선택 시, 그 국적군을 담당하는 상담실장(profiles.recruit_group)을 자동으로 제안.
  // (관리자가 이후 직접 다른 담당자로 바꿀 수 있음 — 자동 제안일 뿐, 강제 아님)
  function onNationalityChange(value: string) {
    if (value !== 'korean' && value !== 'non_korean') return;
    const match = counselors.find((c) => c.recruit_group === value);
    if (match) setCounselorId(match.id);
  }

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
      <label className="block">
        <span className="mb-1 block text-xs text-slate-500">{t('nationality')}</span>
        <select name="nationality" defaultValue={initial?.nationality ?? ''}
          onChange={(e) => onNationalityChange(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="">-</option>
          <option value="korean">{t('nationality_korean')}</option>
          <option value="non_korean">{t('nationality_non_korean')}</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-slate-500">{t('counselor')}</span>
        <select name="counselor_id" value={counselorId} onChange={(e) => setCounselorId(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="">{t('counselor_none')}</option>
          {counselors.map((c) => <option key={c.id} value={c.id}>{c.full_name || c.email}</option>)}
          {initial?.counselor_id && !counselors.some((c) => c.id === initial.counselor_id) && (
            <option value={initial.counselor_id}>{t('counselor_former')}</option>
          )}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-slate-500">{t('program_type')}</span>
        <select name="program_type" defaultValue={initial?.program_type ?? ''}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="">-</option>
          <option value="international">{t('program_international')}</option>
          <option value="local">{t('program_local')}</option>
        </select>
      </label>
      <Field name="enrolled_date" label={t('enrolled_date')} type="date" defaultValue={initial?.enrolled_date ?? ''} />
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
