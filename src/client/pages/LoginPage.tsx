import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogIn, FileWarning, Sparkles } from 'lucide-react';
import { AuthShell } from '../components/AuthShell';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';

const inputCls =
  'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-rose-600/40';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootstrapOpen, setBootstrapOpen] = useState(false);

  useEffect(() => {
    document.title = 'Sign in · Name Crimes';
    api
      .bootstrapStatus()
      .then(({ open }) => setBootstrapOpen(open))
      .catch(() => undefined);
  }, []);

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { user } = await api.login({ username: username.trim(), password });
      setUser(user);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to sign in');
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back. Pick up where the typos left off."
      footer={
        bootstrapOpen ? (
          <Link
            to="/register"
            className="inline-flex items-center gap-1 text-rose-700 hover:text-rose-900 dark:text-rose-300 dark:hover:text-rose-200"
          >
            <Sparkles className="w-3 h-3" aria-hidden />
            First time here? Create the first account
          </Link>
        ) : (
          <span>Need an account? Ask someone to send you an invite link.</span>
        )
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Username
          </span>
          <input
            type="text"
            autoComplete="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={inputCls}
            autoFocus
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Password
          </span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
          />
        </label>
        {error ? (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
            <FileWarning className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-slate-900 text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          <LogIn className="w-4 h-4" aria-hidden />
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  );
}
