import { useEffect, useState } from 'react';
import { Download, FileJson, FileSpreadsheet, Save, Database } from 'lucide-react';
import { Card } from '../components/Card';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import {
  getDefaultCorrectName,
  setDefaultCorrectName,
} from '../lib/storage';

export default function Settings() {
  const [defaultName, setDefaultName] = useState(getDefaultCorrectName());
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const { data: stats } = useApi(() => api.stats(), []);

  useEffect(() => {
    document.title = 'Settings · Name Crimes';
  }, []);

  function saveDefault() {
    setDefaultCorrectName(defaultName.trim() || 'Nicolai');
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2000);
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Tweak the basics. Move on with your life.
        </p>
      </header>

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
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-rose-600/40"
          />
          <button
            type="button"
            onClick={saveDefault}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-slate-900 text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            <Save className="w-4 h-4" aria-hidden /> Save
          </button>
        </div>
        {savedAt ? (
          <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
            Saved.
          </p>
        ) : null}
      </Card>

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
          <a
            href="/api/export.csv"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <FileSpreadsheet className="w-4 h-4" aria-hidden /> Download CSV
          </a>
          <a
            href="/api/export.json"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
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
