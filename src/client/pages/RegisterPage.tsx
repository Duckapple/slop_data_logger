import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { UserPlus, FileWarning, Sparkles, Mail } from 'lucide-react';
import { AuthShell } from '../components/AuthShell';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';

const inputCls =
  'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-rose-600/40';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser } = useAuth();

  const [bootstrapOpen, setBootstrapOpen] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState(searchParams.get('invite') ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Create account · Name Crimes';
    api
      .bootstrapStatus()
      .then(({ open }) => setBootstrapOpen(open))
      .catch(() => setBootstrapOpen(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { user } = await api.register({
        username: username.trim(),
        password,
        displayName: displayNameInput.trim() || undefined,
        inviteCode: inviteCode.trim() || undefined,
      });
      setUser(user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create account');
      setSubmitting(false);
    }
  }

  if (bootstrapOpen === null) {
    return (
      <AuthShell title="Create account">
        <div className="flex justify-center py-4">
          <div className="h-5 w-5 rounded-full border-2 border-slate-300 border-t-rose-600 animate-spin" />
        </div>
      </AuthShell>
    );
  }

  if (!bootstrapOpen && !inviteCode) {
    return (
      <AuthShell
        title="Invite needed"
        subtitle="Registration here is invite-only. Ask someone in the group for a link."
        footer={
          <Link
            to="/login"
            className="text-rose-700 hover:text-rose-900 dark:text-rose-300 dark:hover:text-rose-200"
          >
            Back to sign in
          </Link>
        }
      >
        <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
          <Mail className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
          <span>
            If a friend sent you a link, open it directly — it'll auto-fill the
            invite code.
          </span>
        </div>
      </AuthShell>
    );
  }

  const isBootstrap = bootstrapOpen && !inviteCode;

  return (
    <AuthShell
      title={isBootstrap ? 'Set up the first account' : 'Create your account'}
      subtitle={
        isBootstrap
          ? 'You are the first one here. Pick a username and password — you can invite the rest of the group afterwards.'
          : 'Welcome. Pick a username, a password, and you are in.'
      }
      footer={
        <Link
          to="/login"
          className="text-rose-700 hover:text-rose-900 dark:text-rose-300 dark:hover:text-rose-200"
        >
          Already have an account? Sign in
        </Link>
      }
    >
      {isBootstrap ? (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
          <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden />
          <span>
            Bootstrap mode: any pre-existing incidents will be attributed to
            this account.
          </span>
        </div>
      ) : null}
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
            placeholder="3–32 chars · letters, numbers, _ -"
            autoFocus
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Display name{' '}
            <span className="text-slate-400 dark:text-slate-500 font-normal">
              (optional)
            </span>
          </span>
          <input
            type="text"
            autoComplete="nickname"
            value={displayNameInput}
            onChange={(e) => setDisplayNameInput(e.target.value)}
            className={inputCls}
            placeholder="What people call you"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Password
          </span>
          <input
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            placeholder="At least 8 characters"
          />
        </label>
        {!isBootstrap ? (
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Invite code
            </span>
            <input
              type="text"
              required
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className={inputCls}
              readOnly={Boolean(searchParams.get('invite'))}
            />
          </label>
        ) : null}
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
          <UserPlus className="w-4 h-4" aria-hidden />
          {submitting ? 'Creating…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
}
