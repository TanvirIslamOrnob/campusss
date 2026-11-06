import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({ dark: false, toggle: () => {} });

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    try { const s = localStorage.getItem('campusx-theme'); if (s) return s === 'dark'; } catch { /* storage unavailable */ }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try { localStorage.setItem('campusx-theme', dark ? 'dark' : 'light'); } catch { /* ignore */ }
  }, [dark]);
  return <ThemeContext.Provider value={{ dark, toggle: () => setDark(d => !d) }}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
