import { createContext, useContext, useEffect, useState } from 'react';
import { api, tokenStore } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));

  useEffect(() => {
    if (!tokenStore.get()) return;
    api.me().then(setUser).catch(() => tokenStore.clear()).finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    tokenStore.set(res.token); setUser(res.user);
  };
  const logout = () => { tokenStore.clear(); setUser(null); };

  return <AuthContext.Provider value={{ user, setUser, loading, login, logout }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
