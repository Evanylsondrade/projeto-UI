import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, ApiError } from '../data/api';

export type EmployeeRole = 'gerente' | 'atendente';
export interface Employee { id: string; name: string; email: string; role: EmployeeRole }
interface Session { user: Employee; expiresAt: number }
interface AuthContextValue {
  user: Employee | null;
  loading: boolean;
  authError: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const generation = useRef(0);
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      const revision = generation.current;
      try {
        const next = await api<Session>('/auth/me');
        if (alive && revision === generation.current) { setSession(next); setAuthError(''); }
      } catch (error) {
        if (alive && revision === generation.current) {
          setSession(null);
          setAuthError(error instanceof ApiError && error.status === 401 ? '' : (error as Error).message);
        }
      } finally { if (alive) setLoading(false); }
    };
    const expired = () => { generation.current++; setSession(null); };
    try { sessionStorage.removeItem('smartpet.auth.v1'); } catch { /* Sessão demonstrativa não é aceita. */ }
    void refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('smartpet:session-expired', expired);
    return () => { alive = false; window.removeEventListener('focus', refresh); window.removeEventListener('smartpet:session-expired', expired); };
  }, []);

  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(() => { generation.current++; setSession(null); }, Math.max(0, session.expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [session]);

  const login = useCallback(async (email: string, password: string) => {
    generation.current++;
    const next = await api<Session>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setSession(next);
    setAuthError('');
  }, []);
  const logout = useCallback(async () => {
    // Só confirmar a saída depois que o servidor revogar a sessão.
    await api('/auth/logout', { method: 'POST' });
    generation.current++;
    setSession(null);
  }, []);

  return <AuthContext.Provider value={{ user: session?.user ?? null, loading, authError, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser utilizado dentro de AuthProvider.');
  return context;
}
