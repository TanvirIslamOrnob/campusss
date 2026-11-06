import { useState } from 'react';
import { Bookmark, BookOpen, Download, Flag, Trash2 } from 'lucide-react';
import { api } from '../services/api.js';
import { usePaged } from '../hooks/usePaged.js';
import { useAction } from '../hooks/useAction.js';
import { timeAgo } from '../utils/time.js';
import CourseSelect from '../components/CourseSelect.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ListState from '../components/ui/ListState.jsx';
import Badge from '../components/ui/Badge.jsx';
import IconButton from '../components/ui/IconButton.jsx';
import { Field, Input, Message, inputCls } from '../components/ui/Form.jsx';

function UploadForm({ onCreated }) {
  const [f, setF] = useState({ title: '', departmentId: '', courseId: '' });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async e => {
    e.preventDefault(); setBusy(true); setErr('');
    try { onCreated(await api.uploadMaterial(f.title, f.courseId, file)); setF({ ...f, title: '' }); setFile(null); e.target.reset(); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-bold">Share study material</h2>
      <Message>{err}</Message>
      <Field label="Title"><Input required maxLength={150} value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /></Field>
      <div className="grid gap-3 sm:grid-cols-2"><CourseSelect required departmentId={f.departmentId} courseId={f.courseId} onChange={v => setF({ ...f, ...v })} /></div>
      <Field label="File (PDF, DOCX or PPTX, up to 10 MB)"><input type="file" required accept=".pdf,.docx,.pptx" className={inputCls} onChange={e => setFile(e.target.files[0] || null)} /></Field>
      <button className="btn-primary disabled:opacity-60" disabled={busy || !file}>{busy ? 'Uploading…' : 'Upload'}</button>
    </form>
  );
}

function MaterialCard({ m, onChange, onDelete }) {
  const { err, note, flash, run } = useAction();
  const download = run(() => api.downloadMaterial(m.id, `${m.title}.${m.fileType}`));
  const bookmark = run(async () => { const r = await api.bookmark(m.id); onChange({ ...m, bookmarked: r.bookmarked }); });
  const report = run(async () => { const reason = prompt('What is wrong with this file? (5+ characters)'); if (!reason) return; await api.reportMaterial(m.id, reason); flash('Report sent to moderators'); });
  const remove = run(async () => { if (!confirm('Delete this upload?')) return; await api.deleteMaterial(m.id); onDelete(m.id); });
  return (
    <article className="card space-y-2">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="break-words font-bold">{m.title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{m.courseCode} · {m.courseTitle} · {m.departmentName}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Shared by {m.uploaderName} · {timeAgo(m.createdAt)}</p>
        </div>
        <Badge tone="purple">{m.fileType.toUpperCase()}</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <IconButton icon={Download} label="Download" onClick={download} />
        <IconButton icon={Bookmark} label={m.bookmarked ? 'Bookmarked' : 'Bookmark'} active={m.bookmarked} aria-pressed={m.bookmarked} onClick={bookmark} />
        {m.mine ? <IconButton icon={Trash2} label="Delete" onClick={remove} /> : <IconButton icon={Flag} label="Report" onClick={report} />}
        {note && <span role="status" className="text-xs text-emerald-600 dark:text-emerald-400">{note}</span>}
      </div>
      <Message>{err}</Message>
    </article>
  );
}

export default function Materials() {
  const [draft, setDraft] = useState({ q: '', departmentId: '', courseId: '', bookmarked: false });
  const [filters, setFilters] = useState(draft);
  const { items, setItems, status, error, more, loadMore } = usePaged(p => api.materials({ ...filters, page: p }), [filters]);
  const apply = e => { e.preventDefault(); setFilters(draft); };
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-extrabold">Study materials</h1>
      <UploadForm onCreated={m => setItems(p => [m, ...p])} />
      <form onSubmit={apply} className="card space-y-3" role="search">
        <div className="grid gap-3 sm:grid-cols-2">
          <input className={`${inputCls} sm:col-span-2`} placeholder="Search by title or course code (e.g. CSE201)" aria-label="Search materials" value={draft.q} onChange={e => setDraft({ ...draft, q: e.target.value })} />
          <CourseSelect anyLabel="Any department" departmentId={draft.departmentId} courseId={draft.courseId} onChange={v => setDraft({ ...draft, ...v })} />
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.bookmarked} onChange={e => setDraft({ ...draft, bookmarked: e.target.checked })} />Bookmarked only</label>
          <button className="btn-primary ml-auto">Apply filters</button>
        </div>
      </form>
      <ListState status={status} error={error} count={items.length} more={more} onMore={loadMore}
        empty={<EmptyState icon={BookOpen} title="No materials found" hint="Try different filters, or share the first notes for this course." />}>
        {items.map(m => <MaterialCard key={m.id} m={m} onChange={u => setItems(p => p.map(x => (x.id === u.id ? u : x)))} onDelete={id => setItems(p => p.filter(x => x.id !== id))} />)}
      </ListState>
    </div>
  );
}
