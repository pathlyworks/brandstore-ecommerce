/**
 * AuthProvider: the session in Context, changed only through a reducer (sign in, sign out, expire).
 *
 * - Login and register go through `signIn`; logout through `signOut`; a session that runs out (its `exp`
 *   passes, or the API answers 401) through `expire`. Nothing else writes the session.
 * - The API client reads the token through the bridge connected here (`connectAuth`), so components never pass
 *   tokens around, and the client's single 401 handler lands in `expire` (api/client.ts).
 * - Storage (task_4_security.md §1): the session is kept in memory and mirrored to sessionStorage, so a reload
 *   keeps the shopper signed in but the token does not outlive the tab. It is dropped when read expired,
 *   when its time comes (a timer, cleared on change and unmount), on sign-out and on a 401.
 * - Sign-out also ends the session in this browser's other tabs (a localStorage signal) and removes the
 *   checkout draft (name, phone, address). It never touches the cart: the cart belongs to the device and
 *   survives both sign-in and sign-out.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react';
import type { AuthSession } from '@shared/domain';
import { connectAuth, type AuthBridge } from '../api/client';
import { browserStorage } from '../lib/browserStorage';
import { clearDraft } from './checkout.storage';
import { isSessionValid, parseStoredSession, SESSION_KEY, SIGN_OUT_SIGNAL_KEY } from './session';

/** Why there is no session: never signed in, signed out, or the session ran out / was refused. */
export type SessionEnd = 'none' | 'signed-out' | 'expired';

export interface AuthState {
  session: AuthSession | null;
  ended: SessionEnd;
}

export type AuthAction = { type: 'signIn'; session: AuthSession } | { type: 'signOut' | 'expire' };

/** Pure. */
export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'signIn':
      return { session: action.session, ended: 'none' };
    case 'signOut':
      return state.session === null && state.ended === 'signed-out'
        ? state
        : { session: null, ended: 'signed-out' };
    case 'expire':
      return state.session === null ? state : { session: null, ended: 'expired' };
  }
}

export interface AuthContextValue extends AuthState {
  signIn: (session: AuthSession) => void;
  signOut: () => void;
  expire: () => void;
  /**
   * The first half of "Sign out", done at the click: the API client loses the token and the stored copy is
   * removed at once, so a reload or a request in the next moment is already signed out. The screen changes
   * (signOut) once the user has left the protected area.
   */
  forgetToken: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * The session the API client sees. Updated synchronously in the actions below (not in an effect), so a
 * request made right after sign-in, by a child that renders first, already has the token.
 */
const current: { session: AuthSession | null } = { session: null };

function initialState(): AuthState {
  const session = parseStoredSession(
    browserStorage('sessionStorage')?.getItem(SESSION_KEY) ?? null,
  );
  current.session = session;
  return { session, ended: 'none' };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, undefined, initialState);

  const actions = useMemo(() => {
    const signIn = (session: AuthSession) => {
      current.session = session;
      dispatch({ type: 'signIn', session });
    };
    const expire = () => {
      current.session = null;
      dispatch({ type: 'expire' });
    };
    const signOut = () => {
      current.session = null;
      clearDraft();
      try {
        browserStorage('localStorage')?.setItem(SIGN_OUT_SIGNAL_KEY, String(Date.now()));
      } catch {
        // other tabs keep their session until it expires
      }
      dispatch({ type: 'signOut' });
    };
    const forgetToken = () => {
      current.session = null;
      try {
        browserStorage('sessionStorage')?.removeItem(SESSION_KEY);
      } catch {
        // nothing stored
      }
    };
    return { signIn, signOut, expire, forgetToken };
  }, []);

  // The bridge for the API client: connected during the first render (before any child's effect can make a
  // request) and again in the effect, which also disconnects on unmount.
  const [bridge] = useState<AuthBridge>(() => {
    const value: AuthBridge = {
      getToken: () => (isSessionValid(current.session) ? current.session.token : null),
      onUnauthorized: () => actions.expire(),
    };
    connectAuth(value);
    return value;
  });
  useEffect(() => connectAuth(bridge), [bridge]);

  // Mirror to sessionStorage, and end the session when its time comes.
  const { session } = state;
  useEffect(() => {
    const storage = browserStorage('sessionStorage');
    try {
      if (session) storage?.setItem(SESSION_KEY, JSON.stringify(session));
      else storage?.removeItem(SESSION_KEY);
    } catch {
      // storage blocked: the session lasts for this page only
    }
    if (!session) return undefined;
    const timer = window.setTimeout(actions.expire, Math.max(0, session.expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [session, actions]);

  // Signed out in another tab of this browser → signed out here too.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === SIGN_OUT_SIGNAL_KEY && event.newValue) {
        current.session = null;
        dispatch({ type: 'signOut' });
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo(() => ({ ...state, ...actions }), [state, actions]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
