import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../services/api.js';

const BadgeContext = createContext({ unreadMessages: 0, unreadNotifications: 0, refresh: () => {} });

/** Unread counts for the sidebar and navbar. Refreshed every 30 seconds, and whenever a page changes something. */
export function BadgeProvider({ children }) {
  const [badges, setBadges] = useState({ unreadMessages: 0, unreadNotifications: 0 });
  const refresh = useCallback(() => { api.badges().then(setBadges).catch(() => {}); }, []);
  useEffect(() => { refresh(); const t = setInterval(refresh, 30000); return () => clearInterval(t); }, [refresh]);
  return <BadgeContext.Provider value={{ ...badges, refresh }}>{children}</BadgeContext.Provider>;
}
export const useBadges = () => useContext(BadgeContext);
