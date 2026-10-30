'use client';
import { useRef, useState } from 'react';
import { personnelRoles, type PersonnelRole } from '@/lib/user-provisioning';

export default function CreateUser() {
 const dialog = useRef<HTMLDialogElement>(null);
 const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
 const [fields, setFields] = useState<Record<string, string>>({});
 const [password, setPassword] = useState(''), [showPassword, setShowPassword] = useState(false);
 const [role, setRole] = useState<PersonnelRole>('RESPONDER');
 function close() {
  if (busy) return;
  dialog.current?.close(); setPassword(''); setError(''); setFields({}); setShowPassword(false);
 }
 return <section className="personnel-actions">
  <button type="button" className="button secondary" onClick={() => { setNotice(''); setRole('RESPONDER'); dialog.current?.showModal(); }}>Add Personnel</button>
  {notice && <p className="notice personnel-success" role="status">{notice}</p>}
  <dialog ref={dialog} className="personnel-dialog" aria-labelledby="personnel-title" onCancel={event => { event.preventDefault(); close(); }}>
   <form className="operational-form" onSubmit={async event => {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setBusy(true); setError(''); setFields({});
    try {
     const response = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
     const result = await response.json();
     if (!response.ok) { setFields(result.fields ?? {}); throw new Error(result.error ?? 'Could not create this account.'); }
     setNotice(`${result.user.name}: ${result.message}`);
     form.reset(); setPassword(''); setShowPassword(false); dialog.current?.close();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not create this account. Try again.'); }
    finally { setBusy(false); }
   }}>
    <div className="personnel-heading"><h2 id="personnel-title">Create User</h2><button type="button" className="button secondary" disabled={busy} onClick={close}>Close</button></div>
    <p>Provision an account and share its temporary password securely.</p>
    <fieldset disabled={busy} className="personnel-fields">
     <label className="field">Full Name<input autoFocus name="name" required maxLength={199} autoComplete="name" aria-invalid={!!fields.name}/>{fields.name && <span className="field-error">{fields.name}</span>}</label>
     <label className="field">Email Address<input name="email" type="email" required maxLength={254} autoComplete="email" aria-invalid={!!fields.email}/>{fields.email && <span className="field-error">{fields.email}</span>}</label>
     <label className="field">Role Selection<select name="role" value={role} onChange={event => setRole(event.target.value as PersonnelRole)}>{Object.entries(personnelRoles).map(([code, label]) => <option key={code} value={code}>{code} — {label}</option>)}</select>{fields.role && <span className="field-error">{fields.role}</span>}</label>
     <label className="field">Assigned District / Location<input name="district" required maxLength={80} placeholder={role === 'ADMIN' ? 'National Headquarters' : 'e.g. Musanze'} aria-invalid={!!fields.district}/>{fields.district && <span className="field-error">{fields.district}</span>}</label>
     <label className="field">Temporary Password<input name="password" type={showPassword ? 'text' : 'password'} required minLength={14} maxLength={256} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} aria-invalid={!!fields.password}/>{fields.password && <span className="field-error">{fields.password}</span>}</label>
     <small>Use 14–256 characters. This password is not sent by email.</small>
     <div className="personnel-buttons"><button type="button" className="button secondary" onClick={() => setPassword(`Tmp!${Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('')}`)}>Generate password</button><button type="button" className="button secondary" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide password' : 'Show password'}</button></div>
    </fieldset>
    {error && <p className="notice error" role="alert">{error}</p>}
    <button className="button broadcast" disabled={busy}>{busy ? 'Creating account…' : 'Create User'}</button>
   </form>
  </dialog>
 </section>;
}
