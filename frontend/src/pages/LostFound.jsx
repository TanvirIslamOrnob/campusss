import { useEffect, useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { api } from '../services/api.js';
import { usePaged } from '../hooks/usePaged.js';
import { useAction } from '../hooks/useAction.js';
import EmptyState from '../components/ui/EmptyState.jsx';
import ListState from '../components/ui/ListState.jsx';
import Badge from '../components/ui/Badge.jsx';
import IconButton from '../components/ui/IconButton.jsx';
import { Field, Input, Message, inputCls } from '../components/ui/Form.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const tone = s => ({ PENDING: 'amber', APPROVED: 'green', REJECTED: 'red' }[s] || 'gray');

function ReportForm({ onCreated }) {
  const blank = { type: 'LOST', title: '', description: '', location: '', itemDate: today() };
  const [f, setF] = useState(blank);
  const [image, setImage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const submit = async e => {
    e.preventDefault(); setBusy(true); setErr('');
    try { onCreated(await api.createItem({ ...f, image })); setF(blank); setImage(null); e.target.reset(); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-bold">Report a lost or found item</h2>
      <Message>{err}</Message>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Type"><select className={inputCls} value={f.type} onChange={set('type')}><option value="LOST">I lost something</option><option value="FOUND">I found something</option></select></Field>
        <Field label="Date"><Input type="date" required max={today()} value={f.itemDate} onChange={set('itemDate')} /></Field>
        <Field label="Item"><Input required maxLength={150} value={f.title} onChange={set('title')} /></Field>
        <Field label="Location"><Input required maxLength={150} value={f.location} onChange={set('location')} /></Field>
      </div>
      <Field label="Details (optional)"><textarea rows={2} maxLength={2000} className={inputCls} value={f.description} onChange={set('description')} /></Field>
      <Field label="Photo (optional, PNG or JPEG)"><input type="file" accept="image/png,image/jpeg" className={inputCls} onChange={e => setImage(e.target.files[0] || null)} /></Field>
      <button className="btn-primary disabled:opacity-60" disabled={busy}>{busy ? 'Posting…' : 'Post item'}</button>
    </form>
  );
}

function ItemCard({ item, onChange, onDelete }) {
  const { err, run } = useAction();
  const [claims, setClaims] = useState(null);
  const [showClaim, setShowClaim] = useState(false);
  const [text, setText] = useState('');
  const open = item.status === 'OPEN';
  const toggleClaims = run(async () => { setClaims(claims ? null : await api.itemClaims(item.id)); });
  const decide = run(async (id, status) => {
    await api.decideClaim(id, status);
    setClaims(await api.itemClaims(item.id));
    onChange({ ...item, status: status === 'APPROVED' ? 'RESOLVED' : item.status });
  });
  const claim = run(async e => { e.preventDefault(); await api.claimItem(item.id, text); setShowClaim(false); onChange({ ...item, myClaimStatus: 'PENDING' }); });
  const remove = run(async () => { if (!confirm('Delete this post?')) return; await api.deleteItem(item.id); onDelete(item.id); });
  return (
    <article className="card space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={item.type === 'LOST' ? 'red' : 'green'}>{item.type}</Badge>
        {!open && <Badge>RESOLVED</Badge>}
        <h3 className="min-w-0 flex-1 break-words font-bold">{item.title}</h3>
        {item.mine && <IconButton icon={Trash2} label="Delete" onClick={remove} />}
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{item.location} · {new Date(item.itemDate).toLocaleDateString()} · posted by {item.reporterName}</p>
      {item.description && <p className="whitespace-pre-wrap break-words text-sm">{item.description}</p>}
      {item.imageUrl && <img src={item.imageUrl} alt="The item" className="max-h-72 rounded-xl object-cover" loading="lazy" />}
      {item.mine && <button className="text-sm font-semibold text-volt-600 dark:text-volt-400" onClick={toggleClaims}>{claims ? 'Hide claims' : `View claims (${item.pendingClaims} pending)`}</button>}
      {!item.mine && open && (item.myClaimStatus
        ? <p className="text-sm">Your claim: <Badge tone={tone(item.myClaimStatus)}>{item.myClaimStatus}</Badge></p>
        : showClaim
          ? <form onSubmit={claim} className="flex gap-2"><input className={inputCls} required maxLength={1000} placeholder="Describe how you can prove it's yours / what you know" aria-label="Claim message" value={text} onChange={e => setText(e.target.value)} /><button className="btn-primary">Send</button></form>
          : <button className="btn-primary" onClick={() => setShowClaim(true)}>{item.type === 'FOUND' ? 'This is mine' : 'I found this'}</button>)}
      {claims?.length === 0 && <p className="text-sm text-slate-500">No claims yet.</p>}
      {claims?.map(c => (
        <div key={c.id} className="rounded-xl bg-paper p-3 text-sm dark:bg-navy-950">
          <p><span className="font-semibold">{c.claimantName}</span> <Badge tone={tone(c.status)}>{c.status}</Badge></p>
          <p className="break-words">{c.message}</p>
          {c.status === 'PENDING' && <div className="mt-2 flex gap-2"><button className="btn-primary" onClick={() => decide(c.id, 'APPROVED')}>Approve</button><button className="rounded-xl border border-mist px-3 py-2 text-sm font-semibold dark:border-white/10" onClick={() => decide(c.id, 'REJECTED')}>Reject</button></div>}
        </div>
      ))}
      <Message>{err}</Message>
    </article>
  );
}

function MyClaims() {
  const [claims, setClaims] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api.myClaims().then(setClaims).catch(e => setErr(e.message)); }, []);
  return (
    <div className="space-y-3">
      <Message>{err}</Message>
      {claims === null && !err && <p className="py-6 text-center text-sm">Loading…</p>}
      {claims?.length === 0 && <div className="card"><EmptyState icon={Search} title="No claims yet" hint="When you claim an item, its status shows up here." /></div>}
      {claims?.map(c => <div key={c.id} className="card flex items-center gap-3"><p className="min-w-0 flex-1 break-words font-semibold">{c.itemTitle}</p><Badge tone={tone(c.status)}>{c.status}</Badge></div>)}
    </div>
  );
}

export default function LostFound() {
  const [tab, setTab] = useState('browse');
  const [draft, setDraft] = useState({ q: '', type: '', mine: false });
  const [filters, setFilters] = useState(draft);
  const { items, setItems, status, error, more, loadMore } = usePaged(p => api.items({ ...filters, page: p }), [filters]);
  const tabCls = t => `rounded-xl px-4 py-2 text-sm font-semibold ${tab === t ? 'bg-volt-500 text-white' : 'hover:bg-mist dark:hover:bg-white/10'}`;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-extrabold">Lost &amp; found</h1>
      <div className="flex gap-2" role="tablist"><button role="tab" aria-selected={tab === 'browse'} className={tabCls('browse')} onClick={() => setTab('browse')}>Browse</button><button role="tab" aria-selected={tab === 'claims'} className={tabCls('claims')} onClick={() => setTab('claims')}>My claims</button></div>
      {tab === 'claims' ? <MyClaims /> : (
        <>
          <ReportForm onCreated={i => setItems(p => [i, ...p])} />
          <form onSubmit={e => { e.preventDefault(); setFilters(draft); }} className="card flex flex-wrap items-center gap-3" role="search">
            <input className={`${inputCls} flex-1`} placeholder="Search items, places, details" aria-label="Search items" value={draft.q} onChange={e => setDraft({ ...draft, q: e.target.value })} />
            <select className={`${inputCls} w-auto`} aria-label="Type" value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value })}><option value="">Lost &amp; found</option><option value="LOST">Lost</option><option value="FOUND">Found</option></select>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.mine} onChange={e => setDraft({ ...draft, mine: e.target.checked })} />My posts</label>
            <button className="btn-primary">Search</button>
          </form>
          <ListState status={status} error={error} count={items.length} more={more} onMore={loadMore} empty={<EmptyState icon={Search} title="Nothing here yet" hint="Post a lost or found item to help it get home." />}>
            {items.map(i => <ItemCard key={i.id} item={i} onChange={u => setItems(p => p.map(x => (x.id === u.id ? u : x)))} onDelete={id => setItems(p => p.filter(x => x.id !== id))} />)}
          </ListState>
        </>
      )}
    </div>
  );
}
