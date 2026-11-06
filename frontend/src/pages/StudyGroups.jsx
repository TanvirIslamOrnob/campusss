import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, Users, X } from 'lucide-react';
import { api } from '../services/api.js';
import { usePaged } from '../hooks/usePaged.js';
import { useAction } from '../hooks/useAction.js';
import { useAuth } from '../context/AuthContext.jsx';
import CourseSelect from '../components/CourseSelect.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import Badge from '../components/ui/Badge.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ListState from '../components/ui/ListState.jsx';
import { Field, Input, Message, inputCls } from '../components/ui/Form.jsx';

const ghostBtn = 'rounded-xl border border-mist px-3 py-1.5 text-sm font-semibold hover:bg-mist dark:border-white/10 dark:hover:bg-white/10';

function CreateGroup({ onCreated }) {
  const blank = { name: '', description: '', departmentId: '', courseId: '', visibility: 'PUBLIC' };
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async e => {
    e.preventDefault(); setBusy(true); setErr('');
    try { onCreated(await api.createGroup({ ...f, courseId: Number(f.courseId) })); setF(blank); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-bold">Start a study group</h2>
      <Message>{err}</Message>
      <Field label="Group name"><Input required maxLength={100} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></Field>
      <div className="grid gap-3 sm:grid-cols-2"><CourseSelect required departmentId={f.departmentId} courseId={f.courseId} onChange={v => setF({ ...f, ...v })} /></div>
      <Field label="What will you study? (optional)"><textarea rows={2} maxLength={500} className={inputCls} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></Field>
      <Field label="Who can join?">
        <select className={inputCls} value={f.visibility} onChange={e => setF({ ...f, visibility: e.target.value })}>
          <option value="PUBLIC">Public: anyone can join instantly</option><option value="PRIVATE">Private: you approve each request</option>
        </select>
      </Field>
      <button className="btn-primary disabled:opacity-60" disabled={busy}>{busy ? 'Creating…' : 'Create group'}</button>
    </form>
  );
}

function GroupCard({ g, onChange, onDelete }) {
  const { err, run } = useAction();
  const [members, setMembers] = useState(null);
  const { user } = useAuth();
  const isOwner = g.myRole === 'OWNER';
  const refreshMembers = async () => setMembers(await api.groupMembers(g.id));
  const toggleMembers = run(async () => { if (members) setMembers(null); else await refreshMembers(); });
  const join = run(async () => { const r = await api.joinGroup(g.id); onChange({ ...g, myStatus: r.status, myRole: 'MEMBER', memberCount: g.memberCount + (r.status === 'APPROVED' ? 1 : 0) }); });
  const leave = run(async () => {
    await api.leaveGroup(g.id); setMembers(null);
    onChange({ ...g, myStatus: null, myRole: null, memberCount: g.memberCount - (g.myStatus === 'APPROVED' ? 1 : 0) });
  });
  const remove = run(async () => { if (!confirm('Delete this group for everyone?')) return; await api.deleteGroup(g.id); onDelete(g.id); });
  const decide = run(async (userId, status) => { await api.decideMember(g.id, userId, status); await refreshMembers(); onChange({ ...g, pendingRequests: Math.max(0, g.pendingRequests - 1), memberCount: g.memberCount + (status === 'APPROVED' ? 1 : 0) }); });
  const kick = run(async userId => { if (!confirm('Remove this member?')) return; await api.removeMember(g.id, userId); await refreshMembers(); onChange({ ...g, memberCount: g.memberCount - 1 }); });
  const approved = g.myStatus === 'APPROVED';

  return (
    <article className="card space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 break-words font-bold">{g.name}</h3>
        <Badge tone={g.visibility === 'PRIVATE' ? 'amber' : 'green'}>{g.visibility}</Badge>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{g.courseCode} · {g.courseTitle} · {g.departmentName}</p>
      {g.description && <p className="whitespace-pre-wrap break-words text-sm">{g.description}</p>}
      <p className="text-xs text-slate-500 dark:text-slate-400">Owner: {g.ownerName} · {g.memberCount} member{g.memberCount === 1 ? '' : 's'}{isOwner && g.pendingRequests > 0 ? ` · ${g.pendingRequests} pending request${g.pendingRequests === 1 ? '' : 's'}` : ''}</p>
      <div className="flex flex-wrap gap-2">
        {!g.myStatus && <button className="btn-primary" onClick={join}>{g.visibility === 'PRIVATE' ? 'Request to join' : 'Join group'}</button>}
        {g.myStatus === 'PENDING' && <><Badge tone="amber">Request pending</Badge><button className={ghostBtn} onClick={leave}>Cancel request</button></>}
        {(approved || !(g.visibility === 'PRIVATE')) && <button className={ghostBtn} onClick={toggleMembers}>{members ? 'Hide members' : 'Members'}</button>}
        {approved && !isOwner && <button className={ghostBtn} onClick={leave}>Leave</button>}
        {isOwner && <button className={ghostBtn} onClick={remove}>Delete group</button>}
      </div>
      {members && (
        <ul className="divide-y divide-mist rounded-xl bg-paper px-3 dark:divide-white/10 dark:bg-navy-950">
          {members.map(m => (
            <li key={m.userId} className="flex items-center gap-3 py-2 text-sm">
              <Avatar name={m.name} url={m.avatarUrl} size={28} />
              <span className="min-w-0 flex-1 truncate"><span className="font-semibold">{m.name}</span>{m.departmentName && <span className="text-xs text-slate-500"> · {m.departmentName}</span>}</span>
              {m.role === 'OWNER' && <Badge tone="purple">Owner</Badge>}
              {m.userId !== user.id && <Link to={`/messages?to=${m.userId}`} className="text-xs font-semibold text-volt-600 hover:underline dark:text-volt-400">Message</Link>}
              {m.status === 'PENDING' && isOwner
                ? <><button className="btn-primary" onClick={() => decide(m.userId, 'APPROVED')}>Approve</button><button className={ghostBtn} onClick={() => decide(m.userId, 'REJECTED')}>Decline</button></>
                : isOwner && m.role !== 'OWNER' && <button className={ghostBtn} onClick={() => kick(m.userId)} aria-label={`Remove ${m.name}`}><X className="h-4 w-4" /></button>}
            </li>
          ))}
        </ul>
      )}
      <Message>{err}</Message>
    </article>
  );
}

function GroupsTab() {
  const [draft, setDraft] = useState({ q: '', departmentId: '', courseId: '', mine: false });
  const [filters, setFilters] = useState(draft);
  const { items, setItems, status, error, more, loadMore } = usePaged(p => api.groups({ ...filters, page: p }), [filters]);
  return (
    <div className="space-y-4">
      <CreateGroup onCreated={g => setItems(p => [g, ...p])} />
      <form onSubmit={e => { e.preventDefault(); setFilters(draft); }} className="card space-y-3" role="search">
        <div className="grid gap-3 sm:grid-cols-2">
          <input className={`${inputCls} sm:col-span-2`} placeholder="Search groups or course codes" aria-label="Search groups" value={draft.q} onChange={e => setDraft({ ...draft, q: e.target.value })} />
          <CourseSelect anyLabel="Any department" departmentId={draft.departmentId} courseId={draft.courseId} onChange={v => setDraft({ ...draft, ...v })} />
        </div>
        <div className="flex items-center gap-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.mine} onChange={e => setDraft({ ...draft, mine: e.target.checked })} />My groups</label><button className="btn-primary ml-auto">Search</button></div>
      </form>
      <ListState status={status} error={error} count={items.length} more={more} onMore={loadMore} empty={<EmptyState icon={GraduationCap} title="No groups found" hint="Start the first study group for your course." />}>
        {items.map(g => <GroupCard key={g.id} g={g} onChange={u => setItems(p => p.map(x => (x.id === u.id ? u : x)))} onDelete={id => setItems(p => p.filter(x => x.id !== id))} />)}
      </ListState>
    </div>
  );
}

function MyCourses() {
  const [courses, setCourses] = useState(null);
  const [pick, setPick] = useState({ departmentId: '', courseId: '' });
  const { err, run } = useAction();
  useEffect(() => { api.myCourses().then(setCourses).catch(() => setCourses([])); }, []);
  const save = run(async ids => setCourses(await api.saveMyCourses(ids)));
  const add = () => { if (pick.courseId) { save([...courses.map(c => c.id), Number(pick.courseId)]); setPick({ ...pick, courseId: '' }); } };
  return (
    <section className="card space-y-3">
      <h2 className="font-bold">Courses I'm taking</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">Adding a course lists you in the student finder for that course, with your name, department, semester, bio and skills. Your email and university ID stay private. Remove all courses to disappear.</p>
      <div className="flex flex-wrap gap-2">
        {courses?.map(c => <span key={c.id} className="inline-flex items-center gap-1 rounded-lg bg-volt-500/10 px-2 py-1 text-sm font-semibold text-volt-600 dark:text-volt-400">{c.code}<button aria-label={`Remove ${c.code}`} onClick={() => save(courses.filter(x => x.id !== c.id).map(x => x.id))}><X className="h-3 w-3" /></button></span>)}
        {courses?.length === 0 && <p className="text-sm">No courses yet.</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-3"><CourseSelect departmentId={pick.departmentId} courseId={pick.courseId} onChange={setPick} /><button className="btn-primary justify-center" onClick={add} disabled={!pick.courseId || !courses}>Add course</button></div>
      <Message>{err}</Message>
    </section>
  );
}

function StudentsTab() {
  const [draft, setDraft] = useState({ q: '', departmentId: '', courseId: '' });
  const [filters, setFilters] = useState(draft);
  const { items, status, error, more, loadMore } = usePaged(p => api.students({ ...filters, page: p }), [filters]);
  return (
    <div className="space-y-4">
      <MyCourses />
      <form onSubmit={e => { e.preventDefault(); setFilters(draft); }} className="card space-y-3" role="search">
        <div className="grid gap-3 sm:grid-cols-2">
          <input className={`${inputCls} sm:col-span-2`} placeholder="Search by name, skill or full university ID" aria-label="Search students" value={draft.q} onChange={e => setDraft({ ...draft, q: e.target.value })} />
          <CourseSelect anyLabel="Any department" departmentId={draft.departmentId} courseId={draft.courseId} onChange={v => setDraft({ ...draft, ...v })} />
        </div>
        <button className="btn-primary">Find students</button>
      </form>
      <ListState status={status} error={error} count={items.length} more={more} onMore={loadMore} empty={<EmptyState icon={Users} title="No students found" hint="Students appear here after they add the courses they're taking." />}>
        {items.map(s => (
          <article key={s.id} className="card flex gap-3">
            <Avatar name={s.fullName} url={s.avatarUrl} size={48} />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-bold">{s.fullName}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{[s.departmentName, s.semester && `Semester ${s.semester}`].filter(Boolean).join(' · ')}</p>
              {s.courses && <p className="text-sm"><span className="font-semibold">Courses:</span> {s.courses}</p>}
              {s.skills && <p className="text-sm"><span className="font-semibold">Skills:</span> {s.skills}</p>}
              {s.bio && <p className="break-words text-sm">{s.bio}</p>}
            </div>
            <Link to={`/messages?to=${s.id}`} className="btn-primary h-fit">Message</Link>
          </article>
        ))}
      </ListState>
    </div>
  );
}

export default function StudyGroups() {
  const [tab, setTab] = useState('groups');
  const tabCls = t => `rounded-xl px-4 py-2 text-sm font-semibold ${tab === t ? 'bg-volt-500 text-white' : 'hover:bg-mist dark:hover:bg-white/10'}`;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-extrabold">Study partners</h1>
      <div className="flex gap-2" role="tablist">
        <button role="tab" aria-selected={tab === 'groups'} className={tabCls('groups')} onClick={() => setTab('groups')}>Study groups</button>
        <button role="tab" aria-selected={tab === 'students'} className={tabCls('students')} onClick={() => setTab('students')}>Find students</button>
      </div>
      {tab === 'groups' ? <GroupsTab /> : <StudentsTab />}
    </div>
  );
}
