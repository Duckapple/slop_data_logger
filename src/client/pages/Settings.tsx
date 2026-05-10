import { useEffect, useState } from 'react';
import {
  Download,
  FileJson,
  FileSpreadsheet,
  Save,
  Database,
  User,
  KeyRound,
  LogOut,
  Mail,
  Trash2,
  Copy,
  Check,
  Plus,
} from 'lucide-react';
import { Card } from '../components/Card';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useApi } from '../hooks/useApi';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Invite } from '../../shared/types';
import {
  getDefaultCorrectName,
  setDefaultCorrectName,
} from '../lib/storage';
import { formatRelative } from '../lib/format';

const inputCls =
  'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-rose-600/40';

const primaryBtnCls =
  'inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-slate-900 text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white';

const ghostBtnCls =
  'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800';

export default function Settings() {
  useEffect(() => {
    document.title = 'Settings · Name Crimes';
  }, []);

  const { data: stats } = useApi(() => api.stats(), []);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Account, invites, exports — the housekeeping.
        </p>
      </header>

      <AccountSection />
      <InvitesSection />
      <DefaultNameSection />

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <Download
            className="w-4 h-4 text-slate-500 dark:text-slate-400"
            aria-hidden
          />{' '}
          Export
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Download a snapshot of every incident for safekeeping or analysis.
        </p>
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <a href="/api/export.csv" className={ghostBtnCls}>
            <FileSpreadsheet className="w-4 h-4" aria-hidden /> Download CSV
          </a>
          <a href="/api/export.json" className={ghostBtnCls}>
            <FileJson className="w-4 h-4" aria-hidden /> Download JSON
          </a>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <Database
            className="w-4 h-4 text-slate-500 dark:text-slate-400"
            aria-hidden
          />{' '}
          Storage
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">
              Total incidents
            </dt>
            <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
              {stats?.totalIncidents ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">
              Unique offenders
            </dt>
            <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">
              {stats?.uniqueOffenders ?? '—'}
            </dd>
          </div>
        </dl>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          About
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          A small log for documenting the daily crimes against your name.
          Built on Cloudflare Workers, D1, and R2 — every request runs at the
          edge, every record is yours.
        </p>
      </Card>
    </div>
  );
}

function AccountSection() {
  const { state, setUser, refresh } = useAuth();
  const [displayNameInput, setDisplayNameInput] = useState(
    state.status === 'authed' ? (state.user.displayName ?? '') : '',
  );
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaved, setPwSaved] = useState(false);

  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);
  const [logoutAllRunning, setLogoutAllRunning] = useState(false);

  if (state.status !== 'authed') return null;
  const user = state.user;

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError(null);
    try {
      const trimmed = displayNameInput.trim();
      const { user: updated } = await api.updateProfile({
        displayName: trimmed.length > 0 ? trimmed : null,
      });
      setUser(updated);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch (err) {
      setProfileError(
        err instanceof ApiError ? err.message : 'Failed to save',
      );
    } finally {
      setProfileSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwSaving(true);
    setPwError(null);
    try {
      await api.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 2000);
    } catch (err) {
      setPwError(
        err instanceof ApiError ? err.message : 'Failed to change password',
      );
    } finally {
      setPwSaving(false);
    }
  }

  async function handleLogoutAll() {
    setLogoutAllRunning(true);
    try {
      await api.logoutAll();
      setUser(null);
      window.location.href = '/login';
    } catch {
      setLogoutAllRunning(false);
      setConfirmLogoutAll(false);
      void refresh();
    }
  }

  return (
    <Card className="p-5 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <User
            className="w-4 h-4 text-slate-500 dark:text-slate-400"
            aria-hidden
          />{' '}
          Account
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Signed in as <span className="font-mono">@{user.username}</span>
        </p>
      </div>

      <form onSubmit={saveProfile} className="space-y-2">
        <label className="block">
          <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Display name
          </span>
          <input
            type="text"
            value={displayNameInput}
            onChange={(e) => setDisplayNameInput(e.target.value)}
            placeholder={user.username}
            className={inputCls}
          />
        </label>
        {profileError ? (
          <p className="text-xs text-rose-600 dark:text-rose-400">
            {profileError}
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <button type="submit" disabled={profileSaving} className={primaryBtnCls}>
            <Save className="w-4 h-4" aria-hidden />
            {profileSaving ? 'Saving…' : 'Save display name'}
          </button>
          {profileSaved ? (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              Saved.
            </span>
          ) : null}
        </div>
      </form>

      <form onSubmit={changePassword} className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <KeyRound className="w-4 h-4" aria-hidden /> Change password
        </h3>
        <label className="block">
          <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Current password
          </span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            New password
          </span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputCls}
          />
        </label>
        {pwError ? (
          <p className="text-xs text-rose-600 dark:text-rose-400">{pwError}</p>
        ) : null}
        <div className="flex items-center gap-2">
          <button type="submit" disabled={pwSaving} className={primaryBtnCls}>
            <Save className="w-4 h-4" aria-hidden />
            {pwSaving ? 'Saving…' : 'Update password'}
          </button>
          {pwSaved ? (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              Password updated.
            </span>
          ) : null}
        </div>
      </form>

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setConfirmLogoutAll(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-rose-200 bg-white text-rose-700 transition hover:bg-rose-50 dark:border-rose-900 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-950/30"
        >
          <LogOut className="w-4 h-4" aria-hidden />
          Sign out everywhere
        </button>
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          Revokes every active session for your account, including this one.
        </p>
      </div>

      <ConfirmDialog
        open={confirmLogoutAll}
        title="Sign out everywhere?"
        description="Every active session for your account will be invalidated. You'll need to sign in again."
        confirmLabel="Sign out everywhere"
        destructive
        loading={logoutAllRunning}
        onConfirm={handleLogoutAll}
        onCancel={() => setConfirmLogoutAll(false)}
      />
    </Card>
  );
}

function InvitesSection() {
  const { data, error, loading, refetch } = useApi(() => api.listInvites(), []);
  const [note, setNote] = useState('');
  const [ttlDays, setTtlDays] = useState(7);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      await api.createInvite({
        note: note.trim() || undefined,
        ttlDays,
      });
      setNote('');
      await refetch();
    } catch (err) {
      setCreateError(
        err instanceof ApiError ? err.message : 'Failed to create invite',
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(code: string) {
    try {
      await api.revokeInvite(code);
    } catch {
      // ignore
    }
    await refetch();
  }

  const items = data?.items ?? [];
  const pending = items.filter((i) => i.consumedAt === null);
  const used = items.filter((i) => i.consumedAt !== null);

  return (
    <Card className="p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <Mail
            className="w-4 h-4 text-slate-500 dark:text-slate-400"
            aria-hidden
          />{' '}
          Invites
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Generate a single-use link and send it to a friend. They sign up,
          they're in.
        </p>
      </div>

      <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          placeholder="Note (e.g. for Alice)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={`flex-1 ${inputCls}`}
        />
        <select
          value={ttlDays}
          onChange={(e) => setTtlDays(Number(e.target.value))}
          className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:focus:ring-rose-600/40"
        >
          <option value={1}>Expires in 1 day</option>
          <option value={3}>Expires in 3 days</option>
          <option value={7}>Expires in 7 days</option>
          <option value={30}>Expires in 30 days</option>
        </select>
        <button type="submit" disabled={creating} className={primaryBtnCls}>
          <Plus className="w-4 h-4" aria-hidden />
          {creating ? 'Creating…' : 'Create invite'}
        </button>
      </form>
      {createError ? (
        <p className="text-xs text-rose-600 dark:text-rose-400">
          {createError}
        </p>
      ) : null}

      {error ? (
        <p className="text-xs text-rose-600 dark:text-rose-400">
          Failed to load invites: {error.message}
        </p>
      ) : null}

      {loading && items.length === 0 ? (
        <div className="h-12 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
      ) : null}

      {pending.length > 0 ? (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Pending
          </h3>
          <ul className="space-y-2">
            {pending.map((inv) => (
              <InviteRow key={inv.code} invite={inv} onRevoke={handleRevoke} />
            ))}
          </ul>
        </div>
      ) : null}

      {used.length > 0 ? (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Recently consumed
          </h3>
          <ul className="space-y-1.5">
            {used.slice(0, 5).map((inv) => (
              <li
                key={inv.code}
                className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                <span>
                  {inv.consumedBy
                    ? `Consumed by @${inv.consumedBy.username}`
                    : 'Consumed'}
                  {inv.note ? <> · {inv.note}</> : null}
                </span>
                <span title={inv.consumedAt ?? ''}>
                  {inv.consumedAt
                    ? formatRelative(inv.consumedAt)
                    : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!loading && items.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          No invites yet. The first one will appear here.
        </p>
      ) : null}
    </Card>
  );
}

function InviteRow({
  invite,
  onRevoke,
}: {
  invite: Invite;
  onRevoke: (code: string) => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(invite.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard might be blocked
    }
  }

  return (
    <li className="rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/30">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {invite.note ? (
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                {invite.note}
              </p>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Untitled invite
              </p>
            )}
            <span
              className="text-xs text-slate-400 dark:text-slate-500"
              title={invite.expiresAt}
            >
              expires {formatRelative(invite.expiresAt).replace(/ ago$/, '')}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate font-mono">
            {invite.url}
          </p>
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" aria-hidden /> Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" aria-hidden /> Copy
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => onRevoke(invite.code)}
            aria-label="Revoke invite"
            title="Revoke"
            className="p-1 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/30"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </li>
  );
}

function DefaultNameSection() {
  const [defaultName, setDefaultName] = useState(getDefaultCorrectName());
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function save() {
    setDefaultCorrectName(defaultName.trim() || 'Nicolai');
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2000);
  }

  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        Default correct name
      </h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Pre-filled when you log a new incident. Stored in this browser only.
      </p>
      <div className="mt-3 flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={defaultName}
          onChange={(e) => setDefaultName(e.target.value)}
          className={`flex-1 ${inputCls}`}
        />
        <button type="button" onClick={save} className={primaryBtnCls}>
          <Save className="w-4 h-4" aria-hidden /> Save
        </button>
      </div>
      {savedAt ? (
        <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
          Saved.
        </p>
      ) : null}
    </Card>
  );
}
