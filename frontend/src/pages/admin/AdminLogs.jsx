import { useState } from 'react';
import { ScrollText } from 'lucide-react';
import { api } from '../../services/api.js';
import { usePaged } from '../../hooks/usePaged.js';
import { fmt } from '../../components/admin/ui.jsx';
import Badge from '../../components/ui/Badge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ListState from '../../components/ui/ListState.jsx';
import { inputCls } from '../../components/ui/Form.jsx';

export default function AdminLogs() {
  const [draft, setDraft] = useState('');
  const [action, setAction] = useState('');
  const { items, status, error, more, loadMore } = usePaged(p => api.adminLogs({ action, page: p }), [action]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Activity logs</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">Every staff action is recorded with the time and the responsible admin. Logs can't be edited or deleted from the app.</p>
      <form onSubmit={e => { e.preventDefault(); setAction(draft); }} className="card flex gap-3" role="search">
        <input className={inputCls} placeholder="Filter by action, e.g. SUSPEND" aria-label="Filter by action" value={draft} onChange={e => setDraft(e.target.value.toUpperCase())} />
        <button className="btn-primary">Filter</button>
      </form>
      <ListState status={status} error={error} count={items.length} more={more} onMore={loadMore} empty={<EmptyState icon={ScrollText} title="No log entries" hint="Staff actions will appear here." />}>
        {items.map(l => (
          <article key={l.id} className="card space-y-1">
            <div className="flex flex-wrap items-center gap-2"><Badge tone="purple">{l.action}</Badge><span className="text-sm font-semibold">{l.adminName}</span><span className="text-xs text-slate-500">admin ID {l.adminId}</span><span className="ml-auto text-xs text-slate-500">{fmt(l.createdAt)}</span></div>
            {(l.targetType || l.details) && <p className="break-words text-sm text-slate-600 dark:text-slate-300">{l.targetType && `${l.targetType}${l.targetId != null ? ` #${l.targetId}` : ''} · `}{l.details}</p>}
          </article>
        ))}
      </ListState>
    </div>
  );
}
