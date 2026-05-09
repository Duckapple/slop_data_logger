import { useEffect } from 'react';

type Entry = { keys: string[]; description: string };

const entries: Entry[] = [
  { keys: ['n'], description: 'Log a new incident' },
  { keys: ['/'], description: 'Focus search (incidents page)' },
  { keys: ['g', 'd'], description: 'Go to dashboard' },
  { keys: ['g', 'i'], description: 'Go to incidents' },
  { keys: ['j'], description: 'Move row selection down (incidents)' },
  { keys: ['k'], description: 'Move row selection up (incidents)' },
  { keys: ['Enter'], description: 'Open selected incident' },
  { keys: ['e'], description: 'Edit current incident (detail)' },
  { keys: ['Esc'], description: 'Close dialog or cheatsheet' },
  { keys: ['?'], description: 'Show this cheatsheet' },
];

export function KeyboardCheatsheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cheatsheet-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm dark:bg-slate-950/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-lg border border-slate-200 p-6 dark:bg-slate-900 dark:border-slate-800">
        <h2
          id="cheatsheet-title"
          className="text-base font-semibold text-slate-900 dark:text-slate-100"
        >
          Keyboard shortcuts
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Drive the app like you mean it.
        </p>
        <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {entries.map((e) => (
            <li
              key={e.keys.join(' ')}
              className="flex items-center justify-between py-2"
            >
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {e.description}
              </span>
              <span className="flex gap-1">
                {e.keys.map((k) => (
                  <kbd
                    key={k}
                    className="px-2 py-0.5 text-xs font-mono rounded border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
