import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Settings as SettingsIcon } from 'lucide-react';
import { api } from '../lib/api';
import { displayName, useAuth } from '../lib/auth';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}

export function AccountMenu() {
  const navigate = useNavigate();
  const { state, setUser } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (state.status !== 'authed') return null;
  const user = state.user;
  const name = displayName(user);

  async function handleSignOut() {
    setOpen(false);
    try {
      await api.logout();
    } catch {
      // ignore — clear locally regardless
    }
    setUser(null);
    navigate('/login', { replace: true });
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
      >
        <span
          className="w-7 h-7 rounded-full bg-rose-600 text-white text-xs font-semibold inline-flex items-center justify-center shadow-sm"
          aria-hidden
        >
          {initials(name)}
        </span>
        <span className="hidden sm:inline text-sm text-slate-700 dark:text-slate-300 max-w-[8rem] truncate">
          {name}
        </span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-slate-200 shadow-lg p-1 z-40 dark:bg-slate-900 dark:border-slate-700"
        >
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
              {name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              @{user.username}
            </p>
          </div>
          <Link
            to="/settings"
            onClick={() => setOpen(false)}
            role="menuitem"
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
          >
            <SettingsIcon className="w-4 h-4" aria-hidden /> Account & invites
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
          >
            <LogOut className="w-4 h-4" aria-hidden /> Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
