import { useState } from 'react';
import { CheckCircle2, Pencil, ShoppingBag, Trash2 } from 'lucide-react';
import { api } from '../services/api.js';
import { usePaged } from '../hooks/usePaged.js';
import { useAction } from '../hooks/useAction.js';
import Avatar from '../components/ui/Avatar.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import ListState from '../components/ui/ListState.jsx';
import Badge from '../components/ui/Badge.jsx';
import IconButton from '../components/ui/IconButton.jsx';
import { Field, Input, Message, inputCls } from '../components/ui/Form.jsx';

function SellForm({ onCreated }) {
  const [f, setF] = useState({ title: '', description: '', price: '' });
  const [image, setImage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const submit = async e => {
    e.preventDefault(); setBusy(true); setErr('');
    try { onCreated(await api.createListing({ ...f, image })); setF({ title: '', description: '', price: '' }); setImage(null); e.target.reset(); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-bold">Sell a book or item</h2>
      <Message>{err}</Message>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2"><Field label="Title"><Input required maxLength={150} value={f.title} onChange={set('title')} /></Field></div>
        <Field label="Price"><Input type="number" required min="0" max="1000000" step="0.01" value={f.price} onChange={set('price')} /></Field>
      </div>
      <Field label="Description (condition, edition, course)"><textarea rows={2} maxLength={2000} className={inputCls} value={f.description} onChange={set('description')} /></Field>
      <Field label="Photo (optional, PNG or JPEG)"><input type="file" accept="image/png,image/jpeg" className={inputCls} onChange={e => setImage(e.target.files[0] || null)} /></Field>
      <button className="btn-primary disabled:opacity-60" disabled={busy}>{busy ? 'Listing…' : 'List item'}</button>
    </form>
  );
}

function ListingCard({ l, onChange, onDelete }) {
  const { err, note, flash, run } = useAction();
  const [mode, setMode] = useState(null); // 'edit' | 'contact'
  const [text, setText] = useState('');
  const [edit, setEdit] = useState({ title: l.title, description: l.description || '', price: l.price });
  const send = run(async e => { e.preventDefault(); await api.contactSeller(l.id, text); setMode(null); setText(''); flash('Message sent. Continue the chat in Messages.'); });
  const save = run(async e => { e.preventDefault(); onChange(await api.updateListing(l.id, { ...edit, price: Number(edit.price) })); setMode(null); });
  const sold = run(async () => { await api.markSold(l.id); onChange({ ...l, status: 'SOLD' }); });
  const remove = run(async () => { if (!confirm('Remove this listing?')) return; await api.deleteListing(l.id); onDelete(l.id); });
  const available = l.status === 'AVAILABLE';
  return (
    <article className="card space-y-3">
      <div className="flex gap-4">
        {l.imageUrl && <img src={l.imageUrl} alt="" className="h-24 w-24 shrink-0 rounded-xl object-cover" loading="lazy" />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h3 className="break-words font-bold">{l.title}</h3>{!available && <Badge>SOLD</Badge>}</div>
          <p className="text-xl font-extrabold">{Number(l.price).toFixed(2)}</p>
          <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><Avatar name={l.sellerName} url={l.sellerAvatarUrl} size={20} />{l.sellerName}</p>
        </div>
      </div>
      {l.description && mode !== 'edit' && <p className="whitespace-pre-wrap break-words text-sm">{l.description}</p>}
      {mode === 'edit' && (
        <form onSubmit={save} className="space-y-2">
          <Input required maxLength={150} aria-label="Title" value={edit.title} onChange={e => setEdit({ ...edit, title: e.target.value })} />
          <textarea rows={2} maxLength={2000} aria-label="Description" className={inputCls} value={edit.description} onChange={e => setEdit({ ...edit, description: e.target.value })} />
          <Input type="number" required min="0" max="1000000" step="0.01" aria-label="Price" value={edit.price} onChange={e => setEdit({ ...edit, price: e.target.value })} />
          <button className="btn-primary">Save changes</button>
        </form>
      )}
      {mode === 'contact' && (
        <form onSubmit={send} className="flex gap-2"><input className={inputCls} required maxLength={1000} placeholder="Hi, is this still available?" aria-label="Message to seller" value={text} onChange={e => setText(e.target.value)} /><button className="btn-primary">Send</button></form>
      )}
      <div className="flex flex-wrap items-center gap-1">
        {l.mine ? (<>
          {available && <IconButton icon={Pencil} label="Edit" onClick={() => setMode(mode === 'edit' ? null : 'edit')} />}
          {available && <IconButton icon={CheckCircle2} label="Mark sold" onClick={sold} />}
          <IconButton icon={Trash2} label="Remove" onClick={remove} />
        </>) : available && <button className="btn-primary" onClick={() => setMode(mode === 'contact' ? null : 'contact')}>Contact seller</button>}
        {note && <span role="status" className="text-xs text-emerald-600 dark:text-emerald-400">{note}</span>}
      </div>
      <Message>{err}</Message>
    </article>
  );
}

export default function Marketplace() {
  const [draft, setDraft] = useState({ q: '', mine: false });
  const [filters, setFilters] = useState(draft);
  const { items, setItems, status, error, more, loadMore } = usePaged(p => api.listings({ ...filters, page: p }), [filters]);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-extrabold">Marketplace</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">Buy and sell second-hand books with other students. Payments happen between you and the seller; CAMPUSX doesn't process money.</p>
      <SellForm onCreated={l => setItems(p => [l, ...p])} />
      <form onSubmit={e => { e.preventDefault(); setFilters(draft); }} className="card flex flex-wrap items-center gap-3" role="search">
        <input className={`${inputCls} flex-1`} placeholder="Search listings" aria-label="Search listings" value={draft.q} onChange={e => setDraft({ ...draft, q: e.target.value })} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.mine} onChange={e => setDraft({ ...draft, mine: e.target.checked })} />My listings</label>
        <button className="btn-primary">Search</button>
      </form>
      <ListState status={status} error={error} count={items.length} more={more} onMore={loadMore} empty={<EmptyState icon={ShoppingBag} title="No listings found" hint="List a book you no longer need, or try another search." />}>
        {items.map(l => <ListingCard key={l.id} l={l} onChange={u => setItems(p => p.map(x => (x.id === u.id ? u : x)))} onDelete={id => setItems(p => p.filter(x => x.id !== id))} />)}
      </ListState>
    </div>
  );
}
