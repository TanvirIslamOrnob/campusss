import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { api } from '../../services/api.js';
import { useAction } from '../../hooks/useAction.js';
import { usePaged } from '../../hooks/usePaged.js';
import { dangerBtn, fmt, ghostBtn } from '../../components/admin/ui.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ListState from '../../components/ui/ListState.jsx';
import { Field, Input, Message, inputCls } from '../../components/ui/Form.jsx';

const blank = { title: '', venue: '', startsAt: '', capacity: '', description: '' };

function EventForm({ editing, onSaved, onCancel }) {
  const [f, setF] = useState(editing ? { title: editing.title, venue: editing.venue, startsAt: editing.startsAt.slice(0, 16), capacity: editing.capacity ?? '', description: editing.description ?? '' } : blank);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const submit = async e => {
    e.preventDefault(); setBusy(true); setErr('');
    const body = { ...f, capacity: f.capacity === '' ? null : Number(f.capacity) };
    try { onSaved(editing ? await api.adminUpdateEvent(editing.id, body) : await api.adminCreateEvent(body)); if (!editing) setF(blank); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-bold">{editing ? 'Edit event' : 'Create an event'}</h2>
      <Message>{err}</Message>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title"><Input required maxLength={150} value={f.title} onChange={set('title')} /></Field>
        <Field label="Venue"><Input required maxLength={150} value={f.venue} onChange={set('venue')} /></Field>
        <Field label="Starts"><Input type="datetime-local" required value={f.startsAt} onChange={set('startsAt')} /></Field>
        <Field label="Seats (empty = unlimited)"><Input type="number" min={1} max={100000} value={f.capacity} onChange={set('capacity')} /></Field>
      </div>
      <Field label="Description"><textarea rows={3} maxLength={2000} className={inputCls} value={f.description} onChange={set('description')} /></Field>
      <div className="flex gap-2"><button className="btn-primary disabled:opacity-60" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create event'}</button>{editing && <button type="button" className={ghostBtn} onClick={onCancel}>Cancel</button>}</div>
    </form>
  );
}

function EventRow({ e, onEdit, onDeleted }) {
  const { err, run } = useAction();
  const [regs, setRegs] = useState(null);
  const toggleRegs = run(async () => setRegs(regs ? null : await api.adminRegistrations(e.id)));
  const remove = run(async () => { if (!confirm(`Delete "${e.title}" and all its registrations?`)) return; await api.adminDeleteEvent(e.id); onDeleted(e.id); });
  const kick = run(async u => { if (!confirm(`Remove ${u.name} from this event?`)) return; await api.adminRemoveRegistration(e.id, u.userId); setRegs(await api.adminRegistrations(e.id)); });
  return (
    <article className="card space-y-2">
      <h3 className="font-bold">{e.title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">{fmt(e.startsAt)} · {e.venue} · {e.registeredCount}{e.capacity != null ? ` / ${e.capacity}` : ''} registered</p>
      <div className="flex flex-wrap gap-2"><button className={ghostBtn} onClick={() => onEdit(e)}>Edit</button><button className={ghostBtn} onClick={toggleRegs}>{regs ? 'Hide registrations' : 'Registrations'}</button><button className={dangerBtn} onClick={remove}>Delete</button></div>
      {regs?.length === 0 && <p className="text-sm text-slate-500">No registrations yet.</p>}
      {regs?.length > 0 && (
        <ul className="divide-y divide-mist rounded-xl bg-paper px-3 dark:divide-white/10 dark:bg-navy-950">
          {regs.map(u => <li key={u.userId} className="flex items-center gap-3 py-2 text-sm"><span className="min-w-0 flex-1 truncate"><span className="font-semibold">{u.name}</span> · {u.universityId}{u.departmentName ? ` · ${u.departmentName}` : ''}</span><button className={ghostBtn} onClick={() => kick(u)}>Remove</button></li>)}
        </ul>
      )}
      <Message>{err}</Message>
    </article>
  );
}

export default function AdminEvents() {
  const [past, setPast] = useState(false);
  const [editing, setEditing] = useState(null);
  const [tick, setTick] = useState(0);
  const { items, setItems, status, error, more, loadMore } = usePaged(p => api.events({ past, page: p }), [past, tick]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Events</h1>
      <EventForm key={editing?.id ?? 'new'} editing={editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); setTick(t => t + 1); }} />
      <div className="flex gap-2"><button className={`${ghostBtn} ${!past ? 'bg-mist dark:bg-white/10' : ''}`} onClick={() => setPast(false)}>Upcoming</button><button className={`${ghostBtn} ${past ? 'bg-mist dark:bg-white/10' : ''}`} onClick={() => setPast(true)}>Past</button></div>
      <ListState status={status} error={error} count={items.length} more={more} onMore={loadMore} empty={<EmptyState icon={CalendarDays} title="No events" hint="Create the first one above." />}>
        {items.map(e => <EventRow key={e.id} e={e} onEdit={ev => { setEditing(ev); window.scrollTo({ top: 0, behavior: 'smooth' }); }} onDeleted={id => setItems(p => p.filter(x => x.id !== id))} />)}
      </ListState>
    </div>
  );
}
