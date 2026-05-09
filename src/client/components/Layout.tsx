import { useMemo, useState } from 'react';
import {
  Link,
  NavLink,
  Outlet,
  useNavigate,
} from 'react-router-dom';
import { Gavel, BarChart3, ListChecks, Settings, Keyboard } from 'lucide-react';
import { useKeyboardShortcut, type Shortcut } from '../hooks/useKeyboardShortcut';
import { KeyboardCheatsheet } from './KeyboardCheatsheet';
import { ThemeToggle } from './ThemeToggle';

export default function Layout() {
  const navigate = useNavigate();
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);

  const shortcuts = useMemo<Shortcut[]>(
    () => [
      {
        key: 'n',
        description: 'New incident',
        handler: () => navigate('/new'),
      },
      {
        key: 'g d',
        description: 'Go to dashboard',
        handler: () => navigate('/'),
      },
      {
        key: 'g i',
        description: 'Go to incidents',
        handler: () => navigate('/incidents'),
      },
      {
        key: '?',
        description: 'Open cheatsheet',
        handler: () => setCheatsheetOpen(true),
      },
      {
        key: 'Escape',
        description: 'Close cheatsheet',
        handler: () => setCheatsheetOpen(false),
      },
    ],
    [navigate],
  );
  useKeyboardShortcut(shortcuts);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-rose-50/40 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <header className="sticky top-0 z-30 backdrop-blur bg-white/70 border-b border-slate-200 dark:bg-slate-900/70 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="rounded-lg bg-rose-600 text-white p-1.5 shadow-sm group-hover:bg-rose-700 transition">
              <Gavel className="w-4 h-4" aria-hidden />
            </span>
            <span className="font-semibold tracking-tight text-slate-900 dark:text-slate-100 hidden sm:inline">
              Name Crimes
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            <NavItem to="/" icon={BarChart3} label="Dashboard" end />
            <NavItem to="/incidents" icon={ListChecks} label="Incidents" />
            <NavItem to="/settings" icon={Settings} label="Settings" />
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setCheatsheetOpen(true)}
              aria-label="Keyboard shortcuts"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition"
              title="Keyboard shortcuts (?)"
            >
              <Keyboard className="w-4 h-4" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <Outlet />
      </main>

      <KeyboardCheatsheet
        open={cheatsheetOpen}
        onClose={() => setCheatsheetOpen(false)}
      />
    </div>
  );
}

function NavItem({
  to,
  icon: Icon,
  label,
  end = false,
}: {
  to: string;
  icon: typeof BarChart3;
  label: string;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition ${
          isActive
            ? 'bg-slate-100 text-slate-900 font-medium dark:bg-slate-800 dark:text-slate-100'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800'
        }`
      }
    >
      <Icon className="w-4 h-4" aria-hidden />
      <span className="hidden sm:inline">{label}</span>
    </NavLink>
  );
}
