import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type EmployeeRole = 'gerente' | 'atendente';
export interface Employee { id: string; name: string; email: string; role: EmployeeRole }
interface DemoSession { userId: string; expiresAt: number }
interface AuthContextValue {
  user: Employee | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

// Frontend demonstration only. Replace with server authentication when the API
// is available; route guards here are a navigation convenience, not security.
const DEMO_ACCOUNTS: Array<{ user: Employee; password: string }> = [
  { user: { id: 'employee-manager', name: 'Mariana Lima', email: 'gerente@smartpet.com', role: 'gerente' }, password: 'Gerente123!' },
  { user: { id: 'employee-reception', name: 'Lucas Silva', email: 'atendente@smartpet.com', role: 'atendente' }, password: 'Atendente123!' },
];
const SESSION_KEY = 'smartpet.auth.v1';
const SESSION_DURATION = 8 * 60 * 60 * 1000;
const AuthContext = createContext<AuthContextValue | null>(null);

function readSession(): DemoSession | null {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    const value = JSON.parse(stored) as Partial<DemoSession>;
    if (typeof value.userId === 'string' && typeof value.expiresAt === 'number' && Number.isFinite(value.expiresAt) && value.expiresAt > Date.now() && value.expiresAt <= Date.now() + SESSION_DURATION && DEMO_ACCOUNTS.some(({ user }) => user.id === value.userId)) {
      return { userId: value.userId, expiresAt: value.expiresAt };
    }
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Browsers may block storage. An in-memory session remains usable.
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<DemoSession | null>(readSession);
  const logout = useCallback(() => {
    setSession(null);
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* Clear memory even without storage. */ }
  }, []);

  useEffect(() => {
    if (!session) return;
    const expireIfNeeded = () => { if (Date.now() >= session.expiresAt) logout(); };
    const timer = window.setTimeout(logout, Math.max(0, session.expiresAt - Date.now()));
    document.addEventListener('visibilitychange', expireIfNeeded);
    window.addEventListener('focus', expireIfNeeded);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', expireIfNeeded);
      window.removeEventListener('focus', expireIfNeeded);
    };
  }, [session, logout]);

  const login = useCallback(async (email: string, password: string) => {
    await new Promise<void>((resolve) => window.setTimeout(resolve, 400));
    const account = DEMO_ACCOUNTS.find(({ user, password: expected }) => user.email === email.trim().toLowerCase() && expected === password);
    if (!account) throw new Error('Email ou senha incorretos. Confira os dados e tente novamente.');
    const nextSession = { userId: account.user.id, expiresAt: Date.now() + SESSION_DURATION };
    try {
      // Passwords are never written to browser storage.
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    } catch { /* Use an in-memory session when browser storage is unavailable. */ }
    setSession(nextSession);
  }, []);

  const user = session ? DEMO_ACCOUNTS.find((account) => account.user.id === session.userId)?.user ?? null : null;
  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser utilizado dentro de AuthProvider.');
  return context;
}
