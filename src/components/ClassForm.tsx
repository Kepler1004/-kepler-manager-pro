'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClassRow, updateClassRow } from '@/app/[locale]/(app)/classes/actions';

export interface Opt { id: string; name: string }
export interface ClassRow {
  id?: string; name?: string; subject_id?: string | null; teacher_id?: string | null;
  day_of_week?: number; days?: number[]; start_time?: string; end_time?: string; sessions_per_week?: number;
  session_price?: number; room?: string | null; is_active?: boolean; rate_per_session?: number;
}

export default function ClassForm({ initial, subjects, teachers, onDone }:
  { initial?: ClassRow; subjects: Opt[]; teachers: Opt[]; onDone?: () => void }) {
  const t = useTranslations('klass');
  const tc = useTranslations('common');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const isEdit = !!initial?.id;
  const days = [tc('sun'), tc('mon'), tc('tue'), tc('wed'), tc('thu'), tc('fri'), tc('sat')];

  async function action(formData: FormData) {
    setBusy(true); setErr('');
    try { isEdit ? await updateClassRow(formData) : await createClassRow(formData); onDone?.(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <form action={action} className="grid grid-cols-3 gap-3 rounded-xl border border-slate-200 bg-white p-4">
      {isEdit && <input type="hidden" name="id" defaultValue={initial!.id} />}
      <label className="col-span-2 block"><span className="lbl">{t('name')} *</span>
        <input name="name" required defaultValue={initial?.name ?? ''} className="inp" /></label>
      <label className="block"><span className="lbl">{t('subject')}</span>
        <select name="subject_id" defaultValue={initial?.subject_id ?? ''} className="inp">
          <option value="">—</option>
          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select></label>

      <label className="block"><span className="lbl">{t('teacher')}</span>
        <select name="teacher_id" defaultValue={initial?.teacher_id ?? ''} className="inp">
          <option value="">—</option>
          {teachers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select></label>
      <div className="col-span-2 block">
        <span className="lbl">{tc('day')} ({t('multi_day_hint')})</span>
        <div className="flex flex-wrap gap-3 pt-1">
          {days.map((d, i) => {
            const checked = (initial?.days ?? (initial?.day_of_week != null ? [initial.day_of_week] : [])).includes(i);
            return (
              <label key={i} className="inline-flex items-center gap-1 text-sm">
                <input type="checkbox" name="days" value={i} defaultChecked={checked} />
                <span>{d}</span>
              </label>
            );
          })}
        </div>
      </div>
      <label className="block"><span className="lbl">{t('room')}</span>
        <input name="room" defaultValue={initial?.room ?? ''} className="inp" /></label>

      <label className="block"><span className="lbl">{t('start')}</span>
        <input name="start_time" type="time" defaultValue={initial?.start_time ?? '16:00'} className="inp" /></label>
      <label className="block"><span className="lbl">{t('end')}</span>
        <input name="end_time" type="time" defaultValue={initial?.end_time ?? '17:00'} className="inp" /></label>

      <label className="block"><span className="lbl">{t('session_price')}</span>
        <input name="session_price" type="number" step="0.01" defaultValue={initial?.session_price ?? 0} className="inp" /></label>
      <label className="block"><span className="lbl">{t('rate_per_session')}</span>
        <input name="rate_per_session" type="number" step="0.01" defaultValue={initial?.rate_per_session ?? 0} className="inp" /></label>
      <label className="flex items-end gap-2 pb-2">
        <input name="is_active" type="checkbox" value="true" defaultChecked={initial?.is_active ?? true} />
        <span className="text-sm">{t('active')}</span>
      </label>

      <div className="col-span-3 flex items-center gap-3">
        <button disabled={busy} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {isEdit ? tc('save') : t('add')}</button>
        {onDone && <button type="button" onClick={onDone} className="text-sm text-slate-500">{tc('cancel')}</button>}
        {err && <span className="text-sm text-rose-600">{err}</span>}
      </div>
      <style>{`.lbl{display:block;margin-bottom:4px;font-size:11px;color:#64748b}.inp{width:100%;border:1px solid #cbd5e1;border-radius:6px;padding:8px 12px;font-size:14px}`}</style>
    </form>
  );
}
