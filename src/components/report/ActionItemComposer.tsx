'use client';
// src/components/report/ActionItemComposer.tsx
import { useState } from 'react';
import type { StaffLite, TaskTag } from '@/lib/report/types';

export function ActionItemComposer({ staff }: { staff: StaffLite[] }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState(staff[0]?.id ?? '');
  const [deadline, setDeadline] = useState('');
  const [tag, setTag] = useState<TaskTag>('planning');
  const [bucket, setBucket] = useState<'plan' | 'added'>('plan');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!title.trim() || !assignee) return;
    setBusy(true);
    const res = await fetch('/api/action-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        assignee_id: assignee,
        deadline: deadline || null,
        tag,
        target_bucket: bucket,
      }),
    });
    setBusy(false);
    if (res.ok) {
      setOpen(false);
      setTitle('');
      setDeadline('');
      location.reload();
    } else {
      alert('등록 실패');
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
      >
        + 업무 할당
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl">
            <h3 className="mb-3 text-base font-semibold">업무 할당</h3>

            <label className="mb-2 block text-sm">
              내용
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
                placeholder="업무 내용"
              />
            </label>

            <label className="mb-2 block text-sm">
              담당자
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
              >
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
            </label>

            <div className="mb-2 grid grid-cols-2 gap-2">
              <label className="block text-sm">
                데드라인
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block text-sm">
                태그
                <select
                  value={tag}
                  onChange={(e) => setTag(e.target.value as TaskTag)}
                  className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
                >
                  <option value="urgent">🔴 긴급</option>
                  <option value="planning">🔵 기획</option>
                  <option value="dev">🟢 개발</option>
                  <option value="ops">🟠 운영</option>
                  <option value="etc">⚪ 기타</option>
                </select>
              </label>
            </div>

            <label className="mb-3 block text-sm">
              편입 위치
              <select
                value={bucket}
                onChange={(e) => setBucket(e.target.value as 'plan' | 'added')}
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
              >
                <option value="plan">🎯 내일 할 일</option>
                <option value="added">➕ 오늘 추가된 업무</option>
              </select>
            </label>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded border px-3 py-1.5 text-sm"
              >
                취소
              </button>
              <button
                onClick={submit}
                disabled={busy}
                className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
              >
                {busy ? '등록 중…' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
