import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useAction } from '../../hooks/useAction.js';
import { usePaged } from '../../hooks/usePaged.js';
import { dangerBtn, fmt, ghostBtn, statusTone } from '../../components/admin/ui.jsx';
import Badge from '../../components/ui/Badge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ListState from '../../components/ui/ListState.jsx';
import { Field, Input, Message, inputCls } from '../../components/ui/Form.jsx';
import { UserPlus, Users } from 'lucide-react';

/** One form for both creating and editing. Creating needs a password; editing may set a new temporary one. */
function UserForm({ depts, initial, onSaved, onCancel }) {
  const editing = Boolean(initial);
  const { err, run } = useAction();
  const [f, setF] = useState(initial ? { fullName: initial.fullName, universityId: initial.universityId, email: initial.email, departmentId: initial.departmentId ?? '', semester: initial.semester ?? '', role: initial.role, password: '' }
    : { fullName: '', universityId: '', email: '', departmentId: '', semester: '', role: 'STUDENT', password: '' });
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const save = run(async e => {
    e.preventDefault();
    const body = { fullName: f.fullName, universityId: f.universityId, email: f.email, departmentId: Number(f.departmentId), semester: f.semester ? Number(f.semester) : null };
    if (editing) { if (f.password) body.password = f.password; await api.adminUpdateUser(initial.id, body); onSaved({ ...initial, ...body, departmentName: depts.find(d => d.id === body.departmentId)?.name }); }
    else { await api.adminCreateUser({ ...body, role: f.role, password: f.password }); onSaved(); }
  });
  return (
    <form onSubmit={save} className="card space-y-3">
      <h2 className="font-bold">{editing ? `Edit ${initial.fullName}` : 'Add a user'}</h2>
      <Message>{err}</Message>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name"><Input required maxLength={100} value={f.fullName} onChange={set('fullName')} /></Field>
        <Field label="University ID"><Input required maxLength={30} value={f.universityId} onChange={set('universityId')} /></Field>
        <Field label="Email"><Input type="email" required maxLength={150} value={f.email} onChange={set('email')} /></Field>
        <Field label="Department"><select required className={inputCls} value={f.departmentId} onChange={set('departmentId')}><option value="">Select a department</option>{depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
        <Field label="Semester (optional)"><Input type="number" min={1} max={12} value={f.semester} onChange={set('semester')} /></Field>
        {!editing && <Field label="Role"><select className={inputCls} value={f.role} onChange={set('role')}><option value="STUDENT">Student</option><option value="MODERATOR">Moderator</option></select></Field>}
        <Field label={editing ? 'New temporary password (optional)' : 'Temporary password (8+ characters)'}><Input type="text" autoComplete="off" required={!editing} minLength={8} maxLength={72} value={f.password} onChange={set('password')} /></Field>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{editing ? 'Setting a password makes the user choose their own at next login.' : 'Share the email and this password with the user. They must change it the first time they log in.'}</p>
      <div className="flex gap-2"><button className="btn-primary">{editing ? 'Save changes' : 'Create user'}</button><button type="button" className={ghostBtn} onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

function StudentRow({ s, onChange, depts }) {
  const { user: me } = useAuth();
  const { err, note, flash, run } = useAction();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const manageable = s.role !== 'SUPER_ADMIN' && s.id !== me.id;
  const verify = run(async () => { await api.adminStudentAction(s.id, 'verify'); onChange({ ...s, emailVerified: true, status: s.status === 'PENDING' ? 'ACTIVE' : s.status }); flash('Verified'); });
  const suspend = run(async () => {
    const reason = prompt(`Why are you blocking ${s.fullName}? (5+ characters, saved in the activity log)`);
    if (!reason) return;
    await api.adminStudentAction(s.id, 'suspend', { reason }); onChange({ ...s, status: 'SUSPENDED' }); flash('Blocked');
  });
  const reactivate = run(async () => { await api.adminStudentAction(s.id, 'reactivate'); onChange({ ...s, status: s.emailVerified ? 'ACTIVE' : 'PENDING' }); flash('Unblocked'); });
  const reset = run(async () => { if (!confirm(`Email ${s.fullName} a password reset link?`)) return; await api.adminStudentAction(s.id, 'reset-password'); flash('Reset link sent to the student'); });
  const setRole = run(async e => { await api.adminSetRole(s.id, e.target.value); onChange({ ...s, role: e.target.value }); flash('Role updated'); });
  return (
    <article className="card space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
          <span className="font-bold">{s.fullName}</span> <span className="text-sm text-slate-500">{s.universityId}</span>
        </button>
        <Badge tone={statusTone(s.status)}>{s.status}</Badge>
        {s.role !== 'STUDENT' && <Badge tone="purple">{s.role}</Badge>}
        {!s.emailVerified && <Badge tone="amber">Email unverified</Badge>}
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{s.email} · {s.departmentName || 'No department'}</p>
      {open && (
        <div className="space-y-1 rounded-xl bg-paper p-3 text-sm dark:bg-navy-950">
          <p>Semester: {s.semester ?? 'not set'} · Joined {fmt(s.createdAt)}</p>
          <p>Activity: {s.posts} posts · {s.listings} listings · {s.materials} study files</p>
          {s.skills && <p>Skills: {s.skills}</p>}
          {s.bio && <p className="break-words">Bio: {s.bio}</p>}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {!s.emailVerified && <button className={ghostBtn} onClick={verify}>Verify email</button>}
        {manageable && <button className={ghostBtn} onClick={() => setEditing(!editing)}>Edit</button>}
        {manageable && (s.status === 'SUSPENDED' ? <button className={ghostBtn} onClick={reactivate}>Unblock</button> : <button className={dangerBtn} onClick={suspend}>Block</button>)}
        {manageable && <button className={ghostBtn} onClick={reset}>Send password reset</button>}
        {manageable && <select className={`${inputCls} w-auto py-1.5`} aria-label={`Role for ${s.fullName}`} value={s.role} onChange={setRole}><option value="STUDENT">Student</option><option value="MODERATOR">Moderator</option></select>}
        {note && <span role="status" className="text-xs text-emerald-600 dark:text-emerald-400">{note}</span>}
      </div>
      <Message>{err}</Message>
      {editing && <UserForm depts={depts} initial={s} onCancel={() => setEditing(false)} onSaved={u => { onChange(u); setEditing(false); flash('Saved'); }} />}
    </article>
  );
}

export default function AdminStudents() {
  const [depts, setDepts] = useState([]);
  const [draft, setDraft] = useState({ q: '', departmentId: '', status: '' });
  const [filters, setFilters] = useState(draft);
  const [adding, setAdding] = useState(false);
  useEffect(() => { api.departments().then(setDepts).catch(() => {}); }, []);
  const { items, setItems, status, error, more, loadMore } = usePaged(p => api.adminStudents({ ...filters, page: p }), [filters]);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3"><h1 className="text-2xl font-extrabold">Users</h1><button className="btn-primary" onClick={() => setAdding(!adding)}><UserPlus className="h-4 w-4" aria-hidden />Add user</button></div>
      {adding && <UserForm depts={depts} onCancel={() => setAdding(false)} onSaved={() => { setAdding(false); setFilters(p => ({ ...p })); }} />}
      <form onSubmit={e => { e.preventDefault(); setFilters(draft); }} className="card flex flex-wrap items-center gap-3" role="search">
        <input className={`${inputCls} flex-1`} placeholder="Search name, email or university ID" aria-label="Search students" value={draft.q} onChange={e => setDraft({ ...draft, q: e.target.value })} />
        <select className={`${inputCls} w-auto`} aria-label="Department" value={draft.departmentId} onChange={e => setDraft({ ...draft, departmentId: e.target.value })}><option value="">All departments</option>{depts.map(d => <option key={d.id} value={d.id}>{d.code}</option>)}</select>
        <select className={`${inputCls} w-auto`} aria-label="Status" value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value })}><option value="">Any status</option><option value="ACTIVE">Active</option><option value="PENDING">Pending</option><option value="SUSPENDED">Suspended</option></select>
        <button className="btn-primary">Filter</button>
      </form>
      <ListState status={status} error={error} count={items.length} more={more} onMore={loadMore} empty={<EmptyState icon={Users} title="No students match" hint="Try different filters." />}>
        {items.map(s => <StudentRow key={s.id} s={s} depts={depts} onChange={u => setItems(p => p.map(x => (x.id === u.id ? u : x)))} />)}
      </ListState>
    </div>
  );
}
