import { NavLink } from 'react-router-dom';
import { ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { NAV } from './nav.js';
import { useBadges } from '../../context/BadgeContext.jsx';
import CountPill from '../ui/CountPill.jsx';

export default function Sidebar({ open, onClose }) {
  const { unreadMessages, unreadNotifications } = useBadges();
  const { user } = useAuth();
  const countFor = to => (to === '/messages' ? unreadMessages : to === '/notifications' ? unreadNotifications : 0);
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-navy-950/60 lg:hidden" onClick={onClose} aria-hidden />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy-900 p-4 text-slate-200 transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-8 flex items-center justify-between px-2">
          <span className="text-xl font-extrabold tracking-tight text-white">CAMPUS<span className="text-volt-400">X</span></span>
          <button onClick={onClose} className="lg:hidden" aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={onClose}
              className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-volt-500 text-white' : 'hover:bg-white/10'}`}>
              <Icon className="h-4 w-4" aria-hidden />{label}<CountPill n={countFor(to)} className="ml-auto" />
            </NavLink>
          ))}
          {(user?.role === 'MODERATOR' || user?.role === 'SUPER_ADMIN') && (
            <NavLink to="/admin" onClick={onClose} className="mt-4 flex items-center gap-3 rounded-xl border border-white/20 px-3 py-2.5 text-sm font-semibold hover:bg-white/10"><ShieldCheck className="h-4 w-4" aria-hidden />Admin console</NavLink>
          )}
        </nav>
        <p className="px-2 text-xs text-slate-400">Your Campus. Your Community. Your World.</p>
      </aside>
    </>
  );
}
