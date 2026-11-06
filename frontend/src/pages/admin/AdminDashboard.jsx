import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { fmt } from '../../components/admin/ui.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { Message, inputCls } from '../../components/ui/Form.jsx';

function Announce() {
  const [text, setText] = useState('');
  const [msg, setMsg] = useState({ kind: 'ok', text: '' });
  const send = async e => {
    e.preventDefault();
    if (!confirm('Send this announcement to every active student?')) return;
    try { const r = await api.adminAnnounce(text); setText(''); setMsg({ kind: 'ok', text: `Sent to ${r.sentTo} students.` }); } catch (x) { setMsg({ kind: 'error', text: x.message }); }
  };
  return (
    <form onSubmit={send} className="card space-y-3">
      <h2 className="font-bold">Send an announcement</h2>
      <Message kind={msg.kind}>{msg.text}</Message>
      <textarea rows={2} maxLength={240} required className={inputCls} placeholder="Appears in every student's notifications" aria-label="Announcement" value={text} onChange={e => setText(e.target.value)} />
      <button className="btn-primary">Send to all students</button>
    </form>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [s, setS] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api.adminStats().then(setS).catch(e => setErr(e.message)); }, []);
  const cards = s && [['Registered students', s.students], ['Active students', s.activeStudents], ['Suspended', s.suspendedStudents], ['Posts', s.posts],
    ['Marketplace listings', s.listings], ['Events', s.events], ['Pending reports', s.pendingReports, '/admin/reports']];
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Admin overview</h1>
      <Message>{err}</Message>
      {!s && !err && <p className="text-sm">Loading…</p>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards?.map(([label, n, to]) => {
          const body = <><p className="text-3xl font-extrabold">{n}</p><p className="text-sm text-slate-500 dark:text-slate-400">{label}</p></>;
          return to ? <Link key={label} to={to} className={`card transition hover:border-volt-500 ${n > 0 ? 'border-amber-400' : ''}`}>{body}</Link> : <div key={label} className="card">{body}</div>;
        })}
      </div>
      <section className="card">
        <h2 className="mb-3 font-bold">Recent activity</h2>
        {s?.recent.length === 0 && <p className="text-sm text-slate-500">Nothing yet.</p>}
        <ul className="divide-y divide-mist dark:divide-white/10">
          {s?.recent.map((a, i) => (
            <li key={i} className="flex items-center gap-3 py-2 text-sm"><Badge tone="purple">{a.kind}</Badge><span className="min-w-0 flex-1 truncate">{a.label}</span><span className="text-xs text-slate-500">{fmt(a.at)}</span></li>
          ))}
        </ul>
      </section>
      {user.role === 'SUPER_ADMIN' && <Announce />}
    </div>
  );
}
