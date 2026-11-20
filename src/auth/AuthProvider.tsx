import { useEffect, useState, type ReactNode } from 'react';
import { login as apiLogin } from '@/api/auth';
import { AuthContext } from './auth.context';
import { AUTH_STORAGE_KEY, readSession, saveSession, SESSION_EXPIRED_EVENT } from './session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState(readSession);

  useEffect(() => {
    function onExpired() { setUser(null); }
    function onStorage(event: StorageEvent) {
      if (event.key === AUTH_STORAGE_KEY || event.key === null) setUser(readSession());
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  async function login(username: string, password: string) {
    const nextUser = await apiLogin(username, password);
    saveSession(nextUser);
    setUser(nextUser);
  }

  function logout() {
    void fetch('/__autoloop/session', { method: 'DELETE' }).catch(() => {});
    saveSession(null);
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}
