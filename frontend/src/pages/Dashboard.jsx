import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BookOpen, CalendarDays, GraduationCap, MessageSquareText, PenLine, Search, ShoppingBag } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { timeAgo } from '../utils/time.js';
import Avatar from '../components/ui/Avatar.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { Message } from '../components/ui/Form.jsx';

const ACTIONS = [
  { to: '/community', label: 'New post', icon: PenLine },
  { to: '/materials', label: 'Upload notes', icon: BookOpen },
  { to: '/lost-found', label: 'Report lost item', icon: Search },
  { to: '/marketplace', label: 'Sell a book', icon: ShoppingBag },
  { to: '/groups', label: 'Find study group', icon: GraduationCap },
  { to: '/events', label: 'Browse events', icon: CalendarDays },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [events, setEvents] = useState(null);
  useEffect(() => { api.dashboard().then(setData).catch(e => setError(e.message)); }, []);
  useEffect(() => { api.events({ page: 0 }).then(r => setEvents(r.slice(0, 3))).catch(() => setEvents([])); }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={user.fullName} url={user.avatarUrl} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-extrabold">Welcome back, {user.fullName.split(' ')[0]}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{[user.departmentName, user.semester && `Semester ${user.semester}`, user.universityId].filter(Boolean).join(' · ')}</p>
        </div>
        <Link to="/profile" className="text-sm font-semibold text-volt-600 hover:underline dark:text-volt-400">Edit profile</Link>
      </div>
      <Message>{error}</Message>

      <section aria-label="Quick actions" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {ACTIONS.map(({ to, label, icon: Icon, soon }) => (
          <Link key={to} to={to} className="card flex flex-col items-center gap-2 text-center text-sm font-semibold transition hover:border-volt-500">
            <Icon className="h-5 w-5 text-volt-500" aria-hidden />{label}
            {soon && <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Coming soon</span>}
          </Link>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Recent posts</h2><Link to="/community" className="text-sm font-semibold text-volt-600 dark:text-volt-400">Open community</Link></div>
          {!data && !error && <p className="text-sm">Loading…</p>}
          {data?.recentPosts.length === 0 && <EmptyState icon={MessageSquareText} title="No posts yet" hint="Start the conversation from the Community page." />}
          <ul className="divide-y divide-mist dark:divide-white/10">
            {data?.recentPosts.map(p => (
              <li key={p.id} className="flex gap-3 py-3">
                <Avatar name={p.authorName} url={p.authorAvatarUrl} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm"><span className="font-semibold">{p.authorName}</span> <span className="text-xs text-slate-500">{timeAgo(p.createdAt)}</span></p>
                  <p className="line-clamp-2 break-words text-sm">{p.content}</p>
                  <p className="text-xs text-slate-500">{p.likes} likes · {p.comments} comments</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <div className="space-y-4">
          <section className="card">
            <h2 className="mb-2 flex items-center gap-2 font-bold"><Bell className="h-4 w-4 text-volt-500" />Notifications</h2>
            <p className="text-3xl font-extrabold">{data ? data.unreadNotifications : '–'}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">unread · <Link to="/notifications" className="font-semibold text-volt-600 dark:text-volt-400">View all</Link></p>
          </section>
          <section className="card">
            <h2 className="mb-1 font-bold">Your activity</h2>
            <p className="text-3xl font-extrabold">{data ? data.myPosts : '–'}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">posts shared</p>
          </section>
          <section className="card">
            <div className="mb-2 flex items-center justify-between"><h2 className="font-bold">Upcoming events</h2><Link to="/events" className="text-sm font-semibold text-volt-600 dark:text-volt-400">All events</Link></div>
            {events === null && <p className="text-sm">Loading…</p>}
            {events?.length === 0 && <EmptyState icon={CalendarDays} title="No upcoming events" hint="New campus events will appear here." />}
            <ul className="space-y-2">{events?.map(e => (
              <li key={e.id} className="text-sm"><p className="font-semibold">{e.title}</p><p className="text-xs text-slate-500 dark:text-slate-400">{new Date(e.startsAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} · {e.venue}</p></li>
            ))}</ul>
          </section>
        </div>
      </div>
    </div>
  );
}
