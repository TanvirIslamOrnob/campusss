import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CalendarDays, Heart, Mail, Megaphone, MessageCircle, Search, Users } from 'lucide-react';
import { api } from '../services/api.js';
import { usePaged } from '../hooks/usePaged.js';
import { useBadges } from '../context/BadgeContext.jsx';
import { timeAgo } from '../utils/time.js';
import EmptyState from '../components/ui/EmptyState.jsx';
import ListState from '../components/ui/ListState.jsx';
import { Message } from '../components/ui/Form.jsx';

const ICONS = { LIKE: Heart, COMMENT: MessageCircle, MESSAGE: Mail, EVENT_REMINDER: CalendarDays, CLAIM_UPDATE: Search, ANNOUNCEMENT: Megaphone, GROUP_UPDATE: Users };

export default function Notifications() {
  const nav = useNavigate();
  const { refresh } = useBadges();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [err, setErr] = useState('');
  const { items, setItems, status, error, more, loadMore } = usePaged(p => api.notifications({ unread: unreadOnly, page: p }), [unreadOnly]);

  const open = async n => {
    try { if (!n.read) { await api.readNotification(n.id); setItems(p => p.map(x => (x.id === n.id ? { ...x, read: true } : x))); refresh(); } } catch (e) { setErr(e.message); return; }
    if (n.link) nav(n.link);
  };
  const readAll = async () => {
    try { await api.readAllNotifications(); setItems(p => p.map(x => ({ ...x, read: true }))); refresh(); } catch (e) { setErr(e.message); }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex-1 text-2xl font-extrabold">Notifications</h1>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={unreadOnly} onChange={e => setUnreadOnly(e.target.checked)} />Unread only</label>
        <button className="btn-primary" onClick={readAll}>Mark all read</button>
      </div>
      <Message>{err}</Message>
      <ListState status={status} error={error} count={items.length} more={more} onMore={loadMore} empty={<EmptyState icon={Bell} title={unreadOnly ? "You're all caught up" : 'No notifications yet'} hint="Likes, comments, messages, claims, group updates and event reminders show up here." />}>
        <ul className="space-y-2">
          {items.map(n => {
            const Icon = ICONS[n.type] || Bell;
            return (
              <li key={n.id}>
                <button onClick={() => open(n)} className={`card flex w-full items-center gap-3 text-left transition hover:border-volt-500 ${n.read ? 'opacity-70' : ''}`}>
                  <Icon className="h-5 w-5 shrink-0 text-volt-500" aria-hidden />
                  <span className="min-w-0 flex-1"><span className={`block break-words text-sm ${n.read ? '' : 'font-semibold'}`}>{n.content}</span><span className="text-xs text-slate-500 dark:text-slate-400">{timeAgo(n.createdAt)}</span></span>
                  {!n.read && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-volt-500" aria-label="Unread" />}
                </button>
              </li>
            );
          })}
        </ul>
      </ListState>
    </div>
  );
}
