import { useEffect, useState } from 'react';

type HealthState = 'checking' | 'ok' | 'down';

export default function App() {
  const [health, setHealth] = useState<HealthState>('checking');

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json() as Promise<{ ok: boolean }>)
      .then((d) => setHealth(d.ok ? 'ok' : 'down'))
      .catch(() => setHealth('down'));
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6">
      <div className="rounded-2xl bg-white shadow-md border border-slate-200 p-8 max-w-md w-full">
        <h1 className="text-2xl font-semibold text-slate-900">Name Crimes Dashboard</h1>
        <p className="text-slate-600 mt-2">
          Track, analyze, and emotionally process every spelling offense.
        </p>
        <p className="mt-6 text-sm text-slate-500">
          API status:{' '}
          <span
            className={
              health === 'ok'
                ? 'font-mono text-emerald-600'
                : health === 'down'
                  ? 'font-mono text-rose-600'
                  : 'font-mono text-slate-500'
            }
          >
            {health}
          </span>
        </p>
      </div>
    </main>
  );
}
