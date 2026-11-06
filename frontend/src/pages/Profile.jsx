import { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Field, Input, Message, inputCls } from '../components/ui/Form.jsx';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [depts, setDepts] = useState([]);
  const [f, setF] = useState({ fullName: user.fullName, departmentId: user.departmentId ?? '', semester: user.semester ?? '', bio: user.bio ?? '', skills: user.skills ?? '' });
  const [msg, setMsg] = useState({ kind: 'ok', text: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.departments().then(setDepts).catch(() => {}); }, []);
  const set = k => e => setF({ ...f, [k]: e.target.value });

  const save = async e => {
    e.preventDefault(); setBusy(true); setMsg({ kind: 'ok', text: '' });
    try {
      setUser(await api.updateMe({ ...f, departmentId: f.departmentId ? Number(f.departmentId) : null, semester: f.semester ? Number(f.semester) : null }));
      setMsg({ kind: 'ok', text: 'Profile saved.' });
    } catch (err) { setMsg({ kind: 'error', text: err.message }); } finally { setBusy(false); }
  };
  const upload = async e => {
    const file = e.target.files[0]; if (!file) return;
    try { setUser(await api.uploadAvatar(file)); setMsg({ kind: 'ok', text: 'Photo updated.' }); } catch (err) { setMsg({ kind: 'error', text: err.message }); }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-extrabold">Your profile</h1>
      <div className="card flex items-center gap-4">
        {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
          : <div className="grid h-20 w-20 place-items-center rounded-full bg-volt-500 text-2xl font-bold text-white">{user.fullName[0]}</div>}
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{user.fullName}</p>
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">{user.universityId} · {user.email}</p>
        </div>
        <label className="btn-primary cursor-pointer"><Camera className="h-4 w-4" aria-hidden />Change photo
          <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={upload} /></label>
      </div>
      <form onSubmit={save} className="card space-y-4">
        <Message kind={msg.kind}>{msg.text}</Message>
        <Field label="Full name"><Input required maxLength={100} value={f.fullName} onChange={set('fullName')} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Department">
            <select className={inputCls} value={f.departmentId} onChange={set('departmentId')}>
              <option value="">Not set</option>{depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Semester"><Input type="number" min={1} max={12} value={f.semester} onChange={set('semester')} /></Field>
        </div>
        <Field label="Bio"><textarea rows={3} maxLength={500} className={inputCls} value={f.bio} onChange={set('bio')} /></Field>
        <Field label="Skills and interests (comma separated)"><Input maxLength={300} value={f.skills} onChange={set('skills')} /></Field>
        <button className="btn-primary disabled:opacity-60" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
      </form>
      <div className="card flex items-center justify-between gap-3"><p className="text-sm">Want a new password?</p><Link to="/change-password" className="btn-primary">Change password</Link></div>
    </div>
  );
}
