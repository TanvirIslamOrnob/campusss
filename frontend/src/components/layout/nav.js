import { LayoutDashboard, Users, BookOpen, Search, ShoppingBag, GraduationCap, CalendarDays, MessageCircle, Bell, UserRound } from 'lucide-react';

export const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, phase: 3 },
  { to: '/community', label: 'Community', icon: Users, phase: 3 },
  { to: '/materials', label: 'Study materials', icon: BookOpen, phase: 4 },
  { to: '/lost-found', label: 'Lost & found', icon: Search, phase: 4 },
  { to: '/marketplace', label: 'Marketplace', icon: ShoppingBag, phase: 4 },
  { to: '/groups', label: 'Study groups', icon: GraduationCap, phase: 5 },
  { to: '/events', label: 'Events', icon: CalendarDays, phase: 5 },
  { to: '/messages', label: 'Messages', icon: MessageCircle, phase: 6 },
  { to: '/notifications', label: 'Notifications', icon: Bell, phase: 6 },
  { to: '/profile', label: 'Profile', icon: UserRound, phase: 2 },
];
