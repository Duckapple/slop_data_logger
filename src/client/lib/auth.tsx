import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { CurrentUser } from '../../shared/types';
import { api, ApiError } from './api';

type AuthState =
  | { status: 'loading' }
  | { status: 'authed'; user: CurrentUser }
  | { status: 'anon' };

type AuthContextValue = {
  state: AuthState;
  setUser: (user: CurrentUser | null) => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const refresh = useCallback(async () => {
    try {
      const { user } = await api.me();
      setState({ status: 'authed', user });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setState({ status: 'anon' });
      } else {
        // network/other error — treat as anon to avoid getting stuck
        setState({ status: 'anon' });
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setUser = useCallback((user: CurrentUser | null) => {
    if (user) setState({ status: 'authed', user });
    else setState({ status: 'anon' });
  }, []);

  return (
    <AuthContext.Provider value={{ state, setUser, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function useCurrentUser(): CurrentUser | null {
  const { state } = useAuth();
  return state.status === 'authed' ? state.user : null;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const location = useLocation();
  if (state.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-6 w-6 rounded-full border-2 border-slate-300 border-t-rose-600 animate-spin" />
      </div>
    );
  }
  if (state.status === 'anon') {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }
  return <>{children}</>;
}

export function displayName(user: {
  username: string;
  displayName: string | null;
}): string {
  return user.displayName?.trim() || user.username;
}
