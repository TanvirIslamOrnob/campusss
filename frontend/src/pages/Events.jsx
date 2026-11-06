import { useState } from 'react';
import { CalendarDays, MapPin, Users } from 'lucide-react';
import { api } from '../services/api.js';
import { usePaged } from '../hooks/usePaged.js';
import { useAction } from '../hooks/useAction.js';
import Badge from '../components/ui/Badge.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ListState from '../components/ui/ListState.jsx';
import { Message, inputCls } from '../components/ui/Form.jsx';

const fmt = iso => new Date(iso).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' });

function EventCard({ e, past, onChange }) {
  const { err, run } = useAction();
  const [open, setOpen] = useState(false);
  const full = e.capacity != null && e.registeredCount >= e.capacity;
  const toggle = run(async () => onChange(e.registered ? await api.cancelEvent(e.id) : await api.registerEvent(e.id)));
  return (
    <article className="card space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 break-words text-lg font-bold">{e.title}</h3>
        {e.registered && <Badge tone="green">Registered</Badge>}
        {!e.registered && full && !past && <Badge tone="red">Full</Badge>}
      </div>
      <p className="flex items-center gap-2 text-sm"><CalendarDays className="h-4 w-4 text-volt-500" aria-hidden />{fmt(e.startsAt)}</p>
      <p className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-volt-500" aria-hidden />{e.venue}</p>
      <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><Users className="h-4 w-4" aria-hidden />{e.registeredCount} registered{e.capacity != null ? ` of ${e.capacity} seats` : ''}</p>
      {open && (
        <div className="space-y-2 rounded-xl bg-paper p-3 text-sm dark:bg-navy-950">
          {e.description ? <p className="whitespace-pre-wrap break-words">{e.description}</p> : <p className="text-slate-500">No description provided.</p>}
          <p><span className="font-semibold">Organizer:</span> {e.organizerName}{e.organizerDepartment ? ` · ${e.organizerDepartment}` : ''}</p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button className="rounded-xl border border-mist px-3 py-2 text-sm font-semibold hover:bg-mist dark:border-white/10 dark:hover:bg-white/10" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'Hide details' : 'Details'}</button>
        {!past && (e.registered
          ? <button className="rounded-xl border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10" onClick={toggle}>Cancel registration</button>
          : <button className="btn-primary disabled:opacity-60" onClick={toggle} disabled={full}>{full ? 'Event full' : 'Register'}</button>)}
      </div>
      <Message>{err}</Message>
    </article>
  );
}

export default function Events() {
  const [view, setView] = useState('upcoming');
  const [draft, setDraft] = useState('');
  const [q, setQ] = useState('');
  const { items, setItems, status, error, more, loadMore } = usePaged(p => api.events({ q, registered: view === 'registered', past: view === 'past', page: p }), [view, q]);
  const past = view === 'past';
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-extrabold">Campus events</h1>
      <form onSubmit={ev => { ev.preventDefault(); setQ(draft); }} className="card flex flex-wrap items-center gap-3" role="search">
        <input className={`${inputCls} flex-1`} placeholder="Search events or venues" aria-label="Search events" value={draft} onChange={ev => setDraft(ev.target.value)} />
        <select className={`${inputCls} w-auto`} aria-label="Show" value={view} onChange={ev => setView(ev.target.value)}>
          <option value="upcoming">Upcoming</option><option value="registered">My registrations</option><option value="past">Past events</option>
        </select>
        <button className="btn-primary">Search</button>
      </form>
      <ListState status={status} error={error} count={items.length} more={more} onMore={loadMore}
        empty={<EmptyState icon={CalendarDays} title={view === 'registered' ? "You haven't registered for anything yet" : 'No events here'} hint={view === 'registered' ? 'Browse upcoming events and register.' : 'Check back soon: campus staff add new events regularly.'} />}>
        {items.map(e => <EventCard key={e.id} e={e} past={past} onChange={u => setItems(p => (view === 'registered' && !u.registered ? p.filter(x => x.id !== u.id) : p.map(x => (x.id === u.id ? u : x))))} />)}
      </ListState>
    </div>
  );
}
