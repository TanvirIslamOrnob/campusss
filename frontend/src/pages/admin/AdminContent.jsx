import { useState } from 'react';
import { FileText } from 'lucide-react';
import { api } from '../../services/api.js';
import { useAction } from '../../hooks/useAction.js';
import { usePaged } from '../../hooks/usePaged.js';
import { dangerBtn, fmt, ghostBtn } from '../../components/admin/ui.jsx';
import Badge from '../../components/ui/Badge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ListState from '../../components/ui/ListState.jsx';
import { Message, inputCls } from '../../components/ui/Form.jsx';

const TABS = [['posts', 'Posts'], ['materials', 'Study files'], ['listings', 'Listings']];

function Row({ c, onDone }) {
  const { err, run } = useAction();
  const act = action => run(async () => {
    if (action === 'remove' && !confirm('Remove this item? Its author is notified.')) return;
    await api.adminContentAction(c.type, c.id, action); onDone(c.id);
  });
  return (
    <article className="card space-y-2">
      <p className="break-words font-semibold">{c.title}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">By {c.author} · {fmt(c.createdAt)}</p>
      <div className="flex flex-wrap items-center gap-2">
        {c.openReports > 0 && <Badge tone="amber">{c.openReports} open report{c.openReports === 1 ? '' : 's'}</Badge>}
        {c.removed ? <button className={ghostBtn} onClick={act('restore')}>Restore</button> : <button className={dangerBtn} onClick={act('remove')}>Remove</button>}
      </div>
      <Message>{err}</Message>
    </article>
  );
}

export default function AdminContent() {
  const [tab, setTab] = useState('posts');
  const [draft, setDraft] = useState('');
  const [q, setQ] = useState('');
  const [removed, setRemoved] = useState(false);
  const { items, setItems, status, error, more, loadMore } = usePaged(p => api.adminContent(tab, { q, removed, page: p }), [tab, q, removed]);
  const tabCls = t => `rounded-xl px-4 py-2 text-sm font-semibold ${tab === t ? 'bg-volt-500 text-white' : 'hover:bg-mist dark:hover:bg-white/10'}`;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Content</h1>
      <div className="flex flex-wrap gap-2" role="tablist">{TABS.map(([k, label]) => <button key={k} role="tab" aria-selected={tab === k} className={tabCls(k)} onClick={() => setTab(k)}>{label}</button>)}</div>
      <form onSubmit={e => { e.preventDefault(); setQ(draft); }} className="card flex flex-wrap items-center gap-3" role="search">
        <input className={`${inputCls} flex-1`} placeholder="Search" aria-label="Search content" value={draft} onChange={e => setDraft(e.target.value)} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={removed} onChange={e => setRemoved(e.target.checked)} />Show removed</label>
        <button className="btn-primary">Search</button>
      </form>
      <ListState status={status} error={error} count={items.length} more={more} onMore={loadMore} empty={<EmptyState icon={FileText} title="Nothing here" hint={removed ? 'No removed items.' : 'No content matches.'} />}>
        {items.map(c => <Row key={`${c.type}-${c.id}`} c={c} onDone={id => setItems(p => p.filter(x => x.id !== id))} />)}
      </ListState>
    </div>
  );
}
