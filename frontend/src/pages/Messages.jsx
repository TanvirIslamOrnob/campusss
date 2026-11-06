import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, MessageSquareText, Send, Trash2 } from 'lucide-react';
import { api } from '../services/api.js';
import { useBadges } from '../context/BadgeContext.jsx';
import { timeAgo } from '../utils/time.js';
import Avatar from '../components/ui/Avatar.jsx';
import CountPill from '../components/ui/CountPill.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { Message, inputCls } from '../components/ui/Form.jsx';

const PAGE = 30; // must match MessageService.THREAD_PAGE

function Thread({ active, onBack, onStarted, onActivity }) {
  const convId = active.id;
  const [msgs, setMsgs] = useState([]);
  const [more, setMore] = useState(false);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [menuFor, setMenuFor] = useState(null);
  const seen = useRef(new Set());
  const endRef = useRef();

  const merge = list => setMsgs(prev => {
    const map = new Map(prev.map(m => [m.id, m]));
    list.forEach(m => map.set(m.id, m));
    return [...map.values()].sort((a, b) => a.id - b.id);
  });

  useEffect(() => { // load the thread, then poll every 5 seconds
    setMsgs([]); setMore(false); setErr(''); seen.current = new Set();
    if (!convId) return undefined;
    let live = true;
    const poll = async first => {
      try {
        const r = await api.messages(convId);
        if (!live) return;
        const fresh = r.some(m => !seen.current.has(m.id));
        r.forEach(m => seen.current.add(m.id));
        merge(r);
        if (first) setMore(r.length === PAGE);
        if (first || fresh) onActivity();
      } catch (e) { if (live) setErr(e.message); }
    };
    poll(true);
    const t = setInterval(() => poll(false), 5000);
    return () => { live = false; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convId]);

  const lastId = msgs[msgs.length - 1]?.id;
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [lastId]);

  const earlier = async () => {
    try { const r = await api.messages(convId, msgs[0].id); r.forEach(m => seen.current.add(m.id)); merge(r); setMore(r.length === PAGE); } catch (e) { setErr(e.message); }
  };
  const send = async e => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true); setErr('');
    try {
      if (convId) { const m = await api.sendMessage(convId, text); seen.current.add(m.id); merge([m]); onActivity(); }
      else { const r = await api.startConversation(active.user.id, text); onStarted(r.conversationId); }
      setText('');
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const lastMineId = [...msgs].reverse().find(m => m.mine)?.id;
  const removeMsg = async (m, scope) => {
    setMenuFor(null); setErr('');
    try {
      await api.deleteMessage(convId, m.id, scope);
      if (scope === 'me') setMsgs(prev => prev.filter(x => x.id !== m.id));
      else setMsgs(prev => prev.map(x => (x.id === m.id ? { ...x, body: '', unsent: true } : x)));
      onActivity();
    } catch (x) { setErr(x.message); }
  };

  return (
    <>
      <header className="flex items-center gap-3 border-b border-mist p-3 dark:border-white/10">
        <button onClick={onBack} className="md:hidden" aria-label="Back to conversations"><ArrowLeft className="h-5 w-5" /></button>
        <Avatar name={active.user.name} url={active.user.avatarUrl} size={36} />
        <p className="font-bold">{active.user.name}</p>
      </header>
      <div className="flex-1 space-y-2 overflow-y-auto p-3" aria-live="polite">
        {more && <button className="mx-auto block text-sm font-semibold text-volt-600 dark:text-volt-400" onClick={earlier}>Load earlier messages</button>}
        {!convId && <p className="py-8 text-center text-sm text-slate-500">Say hello to {active.user.name}. Your first message starts the conversation.</p>}
        {msgs.map(m => (
          <div key={m.id} className={`group flex items-start gap-1 ${m.mine ? 'flex-row-reverse' : ''}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.unsent ? 'border border-dashed border-slate-400/50 text-slate-500 dark:text-slate-400' : m.mine ? 'bg-volt-500 text-white' : 'bg-mist dark:bg-white/10'}`}>
              {m.unsent
                ? <p className="italic">{m.mine ? 'You unsent a message' : 'This message was unsent'}</p>
                : <p className="whitespace-pre-wrap break-words">{m.body}</p>}
              <p className={`mt-1 text-xs ${m.mine && !m.unsent ? 'text-white/70' : 'text-slate-500 dark:text-slate-400'}`}>{timeAgo(m.createdAt)}{m.id === lastMineId && m.read && !m.unsent ? ' · Seen' : ''}</p>
            </div>
            <button onClick={() => setMenuFor(menuFor === m.id ? null : m.id)} className="mt-1 rounded-lg p-1 text-slate-500 opacity-60 hover:bg-mist hover:opacity-100 focus:opacity-100 group-hover:opacity-100 dark:text-slate-400 dark:hover:bg-white/10" aria-label="Message options" title="Delete message"><Trash2 className="h-4 w-4" /></button>
            {menuFor === m.id && (
              <div className="flex flex-col gap-1 rounded-xl border border-mist bg-white p-1 text-xs shadow dark:border-white/10 dark:bg-navy-900">
                <button className="rounded-lg px-2 py-1 text-left font-semibold hover:bg-mist dark:hover:bg-white/10" onClick={() => removeMsg(m, 'me')}>Delete for me</button>
                {m.mine && !m.unsent && <button className="rounded-lg px-2 py-1 text-left font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10" onClick={() => removeMsg(m, 'everyone')}>Unsend for everyone</button>}
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="border-t border-mist p-3 dark:border-white/10">
        <Message>{err}</Message>
        <form onSubmit={send} className="mt-2 flex gap-2">
          <input className={inputCls} value={text} maxLength={2000} onChange={e => setText(e.target.value)} placeholder="Write a message" aria-label="Write a message" />
          <button className="btn-primary disabled:opacity-60" disabled={busy || !text.trim()} aria-label="Send"><Send className="h-4 w-4" /></button>
        </form>
      </div>
    </>
  );
}

export default function Messages() {
  const { refresh } = useBadges();
  const [params] = useSearchParams();
  const [convs, setConvs] = useState(null);
  const [error, setError] = useState('');
  const [active, setActive] = useState(null); // { id: number|null, user: { id, name, avatarUrl } }
  const handledTo = useRef(false);

  const loadConvs = useCallback(async () => {
    try { setConvs(await api.conversations()); setError(''); } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { loadConvs(); const t = setInterval(loadConvs, 10000); return () => clearInterval(t); }, [loadConvs]);

  useEffect(() => { // /messages?to=<studentId> opens (or starts) a chat with that student
    const to = Number(params.get('to'));
    if (!to || !convs || handledTo.current) return;
    handledTo.current = true;
    const existing = convs.find(c => c.otherUserId === to);
    if (existing) setActive({ id: existing.id, user: { id: existing.otherUserId, name: existing.otherName, avatarUrl: existing.otherAvatarUrl } });
    else api.publicUser(to).then(u => setActive({ id: null, user: { id: u.id, name: u.fullName, avatarUrl: u.avatarUrl } })).catch(e => setError(e.message));
  }, [params, convs]);

  const onActivity = useCallback(() => { loadConvs(); refresh(); }, [loadConvs, refresh]);
  const onStarted = async id => {
    const list = await api.conversations(); setConvs(list);
    const c = list.find(x => x.id === id);
    if (c) setActive({ id, user: { id: c.otherUserId, name: c.otherName, avatarUrl: c.otherAvatarUrl } });
    refresh();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-3">
      <h1 className="text-2xl font-extrabold">Messages</h1>
      <Message>{error}</Message>
      <div className="grid h-[calc(100vh-11rem)] min-h-[26rem] gap-4 md:grid-cols-[18rem_1fr]">
        <aside className={`card overflow-y-auto p-2 ${active ? 'hidden md:block' : ''}`} aria-label="Conversations">
          {convs === null && !error && <p className="p-4 text-center text-sm">Loading…</p>}
          {convs?.length === 0 && <EmptyState icon={MessageSquareText} title="No conversations yet" hint="Message a student from the Study partners page." />}
          {convs?.map(c => (
            <button key={c.id} onClick={() => setActive({ id: c.id, user: { id: c.otherUserId, name: c.otherName, avatarUrl: c.otherAvatarUrl } })}
              className={`flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-mist dark:hover:bg-white/10 ${active?.id === c.id ? 'bg-mist dark:bg-white/10' : ''}`}>
              <Avatar name={c.otherName} url={c.otherAvatarUrl} size={40} />
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-sm ${c.unread ? 'font-bold' : 'font-semibold'}`}>{c.otherName}</span>
                <span className={`block truncate text-xs ${c.unread ? 'font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>{c.lastMine ? 'You: ' : ''}{c.lastMessage}</span>
              </span>
              <CountPill n={c.unread} />
            </button>
          ))}
        </aside>
        <section className={`card flex-col p-0 ${active ? 'flex' : 'hidden md:flex'}`} aria-label="Conversation">
          {active
            ? <Thread key={active.id ?? `new-${active.user.id}`} active={active} onBack={() => setActive(null)} onStarted={onStarted} onActivity={onActivity} />
            : <div className="grid flex-1 place-items-center"><EmptyState icon={MessageSquareText} title="Select a conversation" hint="Choose a chat on the left, or message a student from Study partners." /></div>}
        </section>
      </div>
    </div>
  );
}
