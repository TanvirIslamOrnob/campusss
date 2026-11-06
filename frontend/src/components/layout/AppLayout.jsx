import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Navbar from './Navbar.jsx';
import { BadgeProvider } from '../../context/BadgeContext.jsx';

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  return (
    <BadgeProvider>
      <div className="min-h-screen">
        <Sidebar open={open} onClose={() => setOpen(false)} />
        <div className="lg:pl-64">
          <Navbar onMenu={() => setOpen(true)} />
          <main className="mx-auto max-w-6xl p-4 sm:p-6"><Outlet /></main>
        </div>
      </div>
    </BadgeProvider>
  );
}
