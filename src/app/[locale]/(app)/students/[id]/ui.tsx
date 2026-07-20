'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase-browser';
import { addCounselingNote, deleteCounselingNote, updateStudentPhoto } from '../actions';

type Student = { id: string; name: string; name_en?: string|null; school?: string|null; grade?: string|null;
  guardian_name?: string|null; guardian_email?: string; phone?: string|null; status?: string|null; photo_url?: string|null };
type Note = { id: string; note_date: string; content: string; author_name: string|null };
type Enrollment = { status: string; classes: { name: string; day_of_week: number; days: number[] | null; start_time: string; end_time: string; room: string | null } | null };

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

export default function StudentDetailClient({ student, notes, enrollments }:
  { student: Student; notes: Note[]; enrollments: Enrollment[] }) {
  const t = useTranslations('student');
  const tc = useTranslations('common');
  const [photo, setPhoto] = useState(student.photo_url ?? '');
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');

  const classes = (enrollments ?? []).filter((e) => e.classes);

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true); setErr('');
    try {
      const supabase = createClient();
      const ext = file.name.split('.').pop();
      const path = `${student.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('student-photos').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('student-photos').getPublicUrl(path);
      await updateStudentPhoto(student.id, data.publicUrl);
      setPhoto(data.publicUrl);
    } catch (e: any) { setErr(e.message ?? 'upload error'); }
    finally { setUploading(false); }
  }

  return (
    <div className="mt-3 space-y-6">
      {/* 학생 정보 + 사진 */}
      <div className="flex gap-5 rounded-xl border border-slate-200 bg-white p-6">
        <div className="shrink-0 text-center">
          <div className="h-32 w-32 overflow-hidden rounded-xl bg-slate-100">
            {photo ? <img src={photo} alt={student.name} className="h-full w-full object-cover" />
                   : <div className="flex h-full w-full items-center justify-center text-slate-300 text-sm">No photo</div>}
          </div>
          <label className="mt-2 block cursor-pointer text-xs text-indigo-600">
            {uploading ? '...' : t('upload_photo')}
            <input type="file" accept="image/*" onChange={onPhoto} className="hidden" />
          </label>
          {err && <div className="mt-1 text-xs text-rose-600">{err}</div>}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{student.name}{student.name_en ? ` (${student.name_en})` : ''}</h1>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-600">
            <div>{t('school')}: {student.school || '-'}</div>
            <div>{t('grade')}: {student.grade || '-'}</div>
            <div>{t('guardian_name')}: {student.guardian_name || '-'}</div>
            <div>{t('guardian_email')}: {student.guardian_email || '-'}</div>
            <div>{t('phone')}: {student.phone || '-'}</div>
            <div>{t('status')}: {student.status}</div>
          </div>
        </div>
      </div>

      {/* 수강 정보 */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-3 text-lg font-bold">{t('enrollments')}</h2>
        {classes.length === 0 ? (
          <p className="text-sm text-slate-400">{t('no_enrollment')}</p>
        ) : (
          <ul className="space-y-1 text-sm text-slate-700">
            {classes.map((e, i) => {
              const c = e.classes!;
              const daysLabel = (c.days && c.days.length ? c.days : [c.day_of_week]).map((d) => DOW[d]).join('·');
              return (
                <li key={i} className="flex items-center gap-2">
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600">{c.name}</span>
                  <span className="text-slate-500">
                    {daysLabel} {String(c.start_time).slice(0, 5)}–{String(c.end_time).slice(0, 5)}{c.room ? ` · ${c.room}` : ''}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 상담 기록 */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-3 text-lg font-bold">{t('counseling')}</h2>
        <form action={async (fd) => { setErr(''); try { await addCounselingNote(fd); } catch (e: any) { setErr(e.message); } }}
          className="mb-4 flex flex-wrap items-end gap-2">
          <input type="hidden" name="student_id" value={student.id} />
          <label className="block"><span className="mb-1 block text-xs text-slate-500">{t('note_date')}</span>
            <input name="note_date" type="date" defaultValue={new Date().toISOString().slice(0,10)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
          <label className="block flex-1"><span className="mb-1 block text-xs text-slate-500">{t('note_content')}</span>
            <input name="content" required placeholder={t('note_placeholder')}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
          <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white">{t('note_add')}</button>
        </form>

        <div className="space-y-2">
          {notes.length === 0 && <p className="text-sm text-slate-400">{t('no_notes')}</p>}
          {notes.map((n) => (
            <div key={n.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{n.note_date} · {n.author_name || ''}</span>
                <form action={deleteCounselingNote} className="inline">
                  <input type="hidden" name="id" value={n.id} />
                  <input type="hidden" name="student_id" value={student.id} />
                  <button className="text-rose-500">{tc('delete')}</button>
                </form>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{n.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
