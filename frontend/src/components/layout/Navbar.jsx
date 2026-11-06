import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Mail, Menu, Moon, Search, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useBadges } from '../../context/BadgeContext.jsx';
import CountPill from '../ui/CountPill.jsx';

export default function Navbar({ onMenu }) {
  const { dark, toggle } = useTheme();
  const { user, logout } = useAuth();
  const { unreadMessages, unreadNotifications } = useBadges();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const btn = 'relative rounded-xl border border-mist p-2 hover:bg-mist dark:border-white/10 dark:hover:bg-white/10';
  const search = e => { e.preventDefault(); nav(q.trim() ? `/community?q=${encodeURIComponent(q.trim())}` : '/community'); };
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-mist bg-paper/90 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-navy-950/90">
      <button onClick={onMenu} className="lg:hidden" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
      <form onSubmit={search} role="search" className="relative max-w-md flex-1">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search posts" aria-label="Search posts"
          className="w-full rounded-xl border border-mist bg-white py-2 pl-9 pr-3 text-sm dark:border-white/10 dark:bg-navy-900" />
      </form>
      <span className="ml-auto hidden max-w-[10rem] truncate text-sm font-semibold sm:block">{user?.fullName}</span>
      <Link to="/messages" className={btn} aria-label="Messages"><Mail className="h-4 w-4" /><CountPill n={unreadMessages} className="absolute -right-2 -top-2" /></Link>
      <Link to="/notifications" className={btn} aria-label="Notifications"><Bell className="h-4 w-4" /><CountPill n={unreadNotifications} className="absolute -right-2 -top-2" /></Link>
      <button onClick={toggle} className={btn} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
      <button onClick={logout} className={btn} aria-label="Log out"><LogOut className="h-4 w-4" /></button>
    </header>
  );
}
