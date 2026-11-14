/**
 * AuthProvider: the session in Context (the header, the account routes and the API calls need it). Kept in
 * sessionStorage under the legacy key; an expired session is dropped when read and when its time comes (the
 * timer is cleared when the session changes or the provider unmounts).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthSession } from '@shared/domain';
import { STORAGE_KEYS } from '../../config';

interface AuthContextValue {
  session: AuthSession | null;
  signIn: (session: AuthSession) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readSession(now = Date.now()): AuthSession | null {
  try {
    const text = window.sessionStorage.getItem(STORAGE_KEYS.session);
    if (!text) return null;
    const data = JSON.parse(text) as Partial<AuthSession>;
    if (typeof data.token !== 'string' || typeof data.expiresAt !== 'number' || !data.user)
      return null;
    return data.expiresAt > now ? (data as AuthSession) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(readSession);

  useEffect(() => {
    try {
      if (session) window.sessionStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
      else window.sessionStorage.removeItem(STORAGE_KEYS.session);
    } catch {
      // storage blocked: the session lasts for this page only
    }
    if (!session) return undefined;
    const timer = window.setTimeout(
      () => setSession(null),
      Math.max(0, session.expiresAt - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [session]);

  const signIn = useCallback((next: AuthSession) => setSession(next), []);
  const signOut = useCallback(() => setSession(null), []);
  const value = useMemo(() => ({ session, signIn, signOut }), [session, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
