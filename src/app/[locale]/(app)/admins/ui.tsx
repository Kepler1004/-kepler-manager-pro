'use client';
import { Fragment, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createUserAccount, updateUserRole, toggleUserActive, updateUserInfo, deleteUserAccount, resetUserPassword } from './actions';
import TeacherPayrollForm from '@/components/TeacherPayrollForm';

type P = { id: string; full_name: string; email: string; role: string; is_active: boolean; phone?: string|null; employment_type?: string; tax_no?: string|null; ic_no?: string|null; epf_no?: string|null; bank_account?: string|null; allowance?: number; google_calendar_id?: string|null; work_days?: number[]|null; payroll_config?: any };

export default function AdminsClient({ profiles, meId, isMaster, canManagePw }: { profiles: P[]; meId: string; isMaster: boolean; canManagePw: boolean }) {
  const t = useTranslations('admin');
  const tr = useTranslations('roles');
  const [adding, setAdding] = useState(false);
  const [payrollId, setPayrollId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [pwId, setPwId] = useState<string | null>(null);
  const [rowErr, setRowErr] = useState('');
  const [err, setErr] = useState('');

  async function add(formData: FormData) {
    setErr('');
    try { await createUserAccount(formData); setAdding(false); }
    catch (e: any) { setErr(e.message); }
  }

  return (
    <div className="space-y-4">
      {isMaster && !adding && (
        <button onClick={() => setAdding(true)} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
          + {t('add_account')}
        </button>
      )}
      {isMaster && adding && (
        <form action={add} className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <label className="block"><span className="mb-1 block text-xs text-slate-500">{t('full_name')}</span>
            <input name="full_name" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
          <label className="block"><span className="mb-1 block text-xs text-slate-500">{t('role')}</span>
            <select name="role" defaultValue="teacher" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="teacher">{tr('teacher')}</option>
              <option value="admin">{tr('admin')}</option>
              <option value="admin_b">{tr('admin_b')}</option>
            </select></label>
          <label className="block"><span className="mb-1 block text-xs text-slate-500">{t('email')} *</span>
            <input name="email" type="email" required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
          <label className="block"><span className="mb-1 block text-xs text-slate-500">{t('init_password')} *</span>
            <input name="password" type="text" required minLength={6} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
          <label className="block"><span className="mb-1 block text-xs text-slate-500">{t('phone')}</span>
            <input name="phone" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
          <div className="col-span-2 flex items-center gap-3">
            <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white">{t('create')}</button>
            <button type="button" onClick={() => setAdding(false)} className="text-sm text-slate-500">{t('cancel')}</button>
            {err && <span className="text-sm text-rose-600">{err}</span>}
          </div>
          <p className="col-span-2 text-xs text-slate-400">{t('account_hint')}</p>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr><th className="px-4 py-2">{t('full_name')}</th><th className="px-4 py-2">{t('email')}</th>
            <th className="px-4 py-2">{t('role')}</th><th className="px-4 py-2">{t('active')}</th><th className="px-4 py-2"></th></tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <Fragment key={p.id}>
              <tr className="border-t border-slate-100">
                <td className="px-4 py-2">{p.full_name || '-'}</td>
                <td className="px-4 py-2">{p.email}{p.phone ? <span className="block text-xs text-slate-400">{p.phone}</span> : null}</td>
                <td className="px-4 py-2">
                  {isMaster ? (
                    <form action={updateUserRole} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={p.id} />
                      <select name="role" defaultValue={p.role} disabled={p.id === meId}
                        className="rounded-md border border-slate-300 px-2 py-1">
                        <option value="master">{tr('master')}</option>
                        <option value="admin">{tr('admin')}</option>
                        <option value="admin_b">{tr('admin_b')}</option>
                        <option value="teacher">{tr('teacher')}</option>
                      </select>
                      {p.id !== meId && <button className="rounded bg-slate-900 px-2 py-1 text-xs text-white">{t('save')}</button>}
                    </form>
                  ) : <span>{tr(p.role as any)}</span>}
                </td>
                <td className="px-4 py-2">
                  {isMaster && p.id !== meId ? (
                    <form action={toggleUserActive}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="active" value={(!p.is_active).toString()} />
                      <button className={p.is_active ? 'text-emerald-600' : 'text-slate-400'}>
                        {p.is_active ? t('active_yes') : t('active_no')}
                      </button>
                    </form>
                  ) : <span className={p.is_active ? 'text-emerald-600' : 'text-slate-400'}>{p.is_active ? t('active_yes') : t('active_no')}</span>}
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  {(p.role === 'teacher' || p.role === 'admin' || p.role === 'admin_b') && (
                    <button onClick={() => { setPayrollId(payrollId === p.id ? null : p.id); setEditId(null); }} className="mr-3 text-indigo-600">
                      {t('payroll_btn')}
                    </button>
                  )}
                  {isMaster && (
                    <button onClick={() => { setEditId(editId === p.id ? null : p.id); setPayrollId(null); setRowErr(''); }} className="mr-3 text-slate-700">
                      {t('edit_info')}
                    </button>
                  )}
                  {canManagePw && (
                    <button onClick={() => { setPwId(pwId === p.id ? null : p.id); setRowErr(''); }} className="mr-3 text-amber-700">
                      {t('reset_pw')}
                    </button>
                  )}
                  {isMaster && p.id !== meId && (
                    <form action={deleteUserAccount} className="inline"
                      onSubmit={(e) => { if (!confirm(t('confirm_delete_account'))) e.preventDefault(); }}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="text-rose-600">{t('delete_account')}</button>
                    </form>
                  )}
                </td>
              </tr>
              {pwId === p.id && (
                <tr><td colSpan={5} className="bg-amber-50 px-4 py-3">
                  <form action={async (fd) => { setRowErr(''); try { await resetUserPassword(fd); setPwId(null); alert('변경되었습니다.'); } catch (e: any) { setRowErr(e.message); } }}
                    className="flex items-end gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    <label className="block"><span className="mb-1 block text-xs text-slate-500">{t('new_password')}</span>
                      <input name="password" type="text" minLength={6} required className="rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
                    <button className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white">{t('save')}</button>
                    <button type="button" onClick={() => setPwId(null)} className="text-sm text-slate-500">{t('cancel')}</button>
                    {rowErr && <span className="text-sm text-rose-600">{rowErr}</span>}
                  </form>
                </td></tr>
              )}
              {editId === p.id && (
                <tr><td colSpan={5} className="bg-slate-50 px-4 py-3">
                  <form action={async (fd) => { setRowErr(''); try { await updateUserInfo(fd); setEditId(null); } catch (e: any) { setRowErr(e.message); } }}
                    className="grid grid-cols-3 gap-3">
                    <input type="hidden" name="id" value={p.id} />
                    <label className="block"><span className="mb-1 block text-xs text-slate-500">{t('full_name')}</span>
                      <input name="full_name" defaultValue={p.full_name} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
                    <label className="block"><span className="mb-1 block text-xs text-slate-500">{t('email')} *</span>
                      <input name="email" type="email" required defaultValue={p.email} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
                    <label className="block"><span className="mb-1 block text-xs text-slate-500">{t('phone')}</span>
                      <input name="phone" defaultValue={p.phone ?? ''} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label>
                    <div className="col-span-3 flex items-center gap-3">
                      <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white">{t('save')}</button>
                      <button type="button" onClick={() => setEditId(null)} className="text-sm text-slate-500">{t('cancel')}</button>
                      {rowErr && <span className="text-sm text-rose-600">{rowErr}</span>}
                    </div>
                  </form>
                </td></tr>
              )}
              {payrollId === p.id && (
                <tr><td colSpan={5} className="bg-slate-50 px-4 py-3">
                  <TeacherPayrollForm teacher={p} onDone={() => setPayrollId(null)} />
                </td></tr>
              )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
