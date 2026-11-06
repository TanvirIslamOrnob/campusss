import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { ArrowLeft, CalendarDays, FileText, Flag, LayoutDashboard, LogOut, Menu, Moon, ScrollText, Sun, Users, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import Badge from '../ui/Badge.jsx';

const ITEMS = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/reports', label: 'Reports', icon: Flag },
  { to: '/admin/content', label: 'Content', icon: FileText },
  { to: '/admin/events', label: 'Events', icon: CalendarDays },
  { to: '/admin/students', label: 'Users', icon: Users, superOnly: true },
  { to: '/admin/logs', label: 'Activity logs', icon: ScrollText, superOnly: true },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const isSuper = user.role === 'SUPER_ADMIN';
  const btn = 'rounded-xl border border-mist p-2 hover:bg-mist dark:border-white/10 dark:hover:bg-white/10';
  return (
    <div className="min-h-screen">
      {open && <div className="fixed inset-0 z-30 bg-navy-950/60 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-navy-950 p-4 text-slate-200 transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-8 flex items-center justify-between px-2">
          <span className="text-lg font-extrabold tracking-tight text-white">CAMPUS<span className="text-volt-400">X</span> <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Admin</span></span>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {ITEMS.filter(i => !i.superOnly || isSuper).map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-volt-500 text-white' : 'hover:bg-white/10'}`}>
              <Icon className="h-4 w-4" aria-hidden />{label}
            </NavLink>
          ))}
        </nav>
        <Link to="/" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-white/10"><ArrowLeft className="h-4 w-4" aria-hidden />Back to CampusX</Link>
      </aside>
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-mist bg-paper/90 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-navy-950/90">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <Badge tone={isSuper ? 'purple' : 'amber'}>{isSuper ? 'Super admin' : 'Moderator'}</Badge>
          <span className="ml-auto hidden text-sm font-semibold sm:block">{user.fullName}</span>
          <button onClick={toggle} className={btn} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>{dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</button>
          <button onClick={logout} className={btn} aria-label="Log out"><LogOut className="h-4 w-4" /></button>
        </header>
        <main className="mx-auto max-w-6xl p-4 sm:p-6"><Outlet /></main>
      </div>
    </div>
  );
}
