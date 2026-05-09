import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Filter,
  Plus,
  FileWarning,
} from 'lucide-react';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { EditDistanceBadge } from '../components/EditDistanceBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useApi } from '../hooks/useApi';
import {
  useKeyboardShortcut,
  type Shortcut,
} from '../hooks/useKeyboardShortcut';
import { api, type ListQuery } from '../lib/api';
import { formatRelative } from '../lib/format';

const PAGE_SIZE = 20;

type SortKey = NonNullable<ListQuery['sort']>;

const SORT_LABELS: Record<SortKey, string> = {
  occurredAt_desc: 'Most recent first',
  occurredAt_asc: 'Oldest first',
  editDistance_desc: 'Worst spellings first',
  offender_asc: 'Offender A→Z',
};

const inputCls =
  'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-rose-600/40';

const smallInputCls =
  'w-full px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-rose-600/40';

function readFilters(sp: URLSearchParams): ListQuery & { page: number } {
  const page = Math.max(1, Number(sp.get('page') ?? '1') || 1);
  return {
    q: sp.get('q') ?? undefined,
    source: sp.get('source') ?? undefined,
    editDistanceMin: sp.get('edMin') ? Number(sp.get('edMin')) : undefined,
    editDistanceMax: sp.get('edMax') ? Number(sp.get('edMax')) : undefined,
    from: sp.get('from') ?? undefined,
    to: sp.get('to') ?? undefined,
    sort: (sp.get('sort') as SortKey | null) ?? 'occurredAt_desc',
    page,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };
}

export default function IncidentsList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);

  const [searchInput, setSearchInput] = useState(filters.q ?? '');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = 'Incidents · Name Crimes';
  }, []);

  useEffect(() => {
    setSearchInput(filters.q ?? '');
  }, [filters.q]);

  useEffect(() => {
    if ((filters.q ?? '') === searchInput) return;
    const t = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (searchInput) next.set('q', searchInput);
      else next.delete('q');
      next.set('page', '1');
      setSearchParams(next, { replace: true });
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, filters.q, searchParams, setSearchParams]);

  const { data, error, loading, refetch } = useApi(
    () =>
      api.list({
        q: filters.q,
        source: filters.source,
        editDistanceMin: filters.editDistanceMin,
        editDistanceMax: filters.editDistanceMax,
        from: filters.from,
        to: filters.to,
        sort: filters.sort,
        limit: filters.limit,
        offset: filters.offset,
      }),
    [
      filters.q,
      filters.source,
      filters.editDistanceMin,
      filters.editDistanceMax,
      filters.from,
      filters.to,
      filters.sort,
      filters.limit,
      filters.offset,
    ],
  );

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    setSelectedIndex(0);
  }, [items.length]);

  function setParam(key: string, value: string | undefined) {
    const next = new URLSearchParams(searchParams);
    if (!value) next.delete(key);
    else next.set(key, value);
    next.set('page', '1');
    setSearchParams(next, { replace: true });
  }

  function setPage(page: number) {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(page));
    setSearchParams(next);
  }

  function clearAll() {
    setSearchParams(new URLSearchParams(), { replace: true });
    setSearchInput('');
  }

  const hasActiveFilters =
    Boolean(filters.q) ||
    Boolean(filters.source) ||
    filters.editDistanceMin !== undefined ||
    filters.editDistanceMax !== undefined ||
    Boolean(filters.from) ||
    Boolean(filters.to);

  const shortcuts = useMemo<Shortcut[]>(
    () => [
      {
        key: '/',
        description: 'Focus search',
        handler: () => searchRef.current?.focus(),
      },
      {
        key: 'j',
        description: 'Next row',
        handler: () => {
          if (items.length > 0) {
            setSelectedIndex((i) => Math.min(items.length - 1, i + 1));
          }
        },
      },
      {
        key: 'k',
        description: 'Previous row',
        handler: () => {
          if (items.length > 0) {
            setSelectedIndex((i) => Math.max(0, i - 1));
          }
        },
      },
      {
        key: 'Enter',
        description: 'Open selected',
        handler: () => {
          const item = items[selectedIndex];
          if (item) navigate(`/incidents/${item.id}`);
        },
      },
    ],
    [items, selectedIndex, navigate],
  );
  useKeyboardShortcut(shortcuts);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.remove(pendingDelete.id);
      setPendingDelete(null);
      await refetch();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Incidents
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Every spelling crime, ordered by your sense of grievance.
          </p>
        </div>
        <Link
          to="/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-slate-900 text-white shadow-sm transition w-fit hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          <Plus className="w-4 h-4" aria-hidden />
          Log incident
        </Link>
      </header>

      <Card className="p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500"
              aria-hidden
            />
            <input
              ref={searchRef}
              type="search"
              placeholder="Search incidents… (press / to focus)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={`pl-9 ${inputCls}`}
              aria-label="Search incidents"
            />
          </div>
          <select
            value={filters.sort}
            onChange={(e) => setParam('sort', e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:focus:ring-rose-600/40"
            aria-label="Sort"
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <option key={k} value={k}>
                {SORT_LABELS[k]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition ${
              filtersOpen || hasActiveFilters
                ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
            aria-expanded={filtersOpen}
          >
            <Filter className="w-4 h-4" aria-hidden />
            Filters
          </button>
        </div>

        {filtersOpen ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <FilterField label="Source">
              <input
                type="text"
                placeholder="Email, Slack, …"
                value={filters.source ?? ''}
                onChange={(e) => setParam('source', e.target.value || undefined)}
                className={smallInputCls}
              />
            </FilterField>
            <FilterField label="Edit distance">
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min={0}
                  placeholder="Min"
                  value={filters.editDistanceMin ?? ''}
                  onChange={(e) => setParam('edMin', e.target.value || undefined)}
                  className={smallInputCls}
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Max"
                  value={filters.editDistanceMax ?? ''}
                  onChange={(e) => setParam('edMax', e.target.value || undefined)}
                  className={smallInputCls}
                />
              </div>
            </FilterField>
            <FilterField label="From">
              <input
                type="date"
                value={filters.from ? filters.from.slice(0, 10) : ''}
                onChange={(e) =>
                  setParam(
                    'from',
                    e.target.value ? `${e.target.value}T00:00:00Z` : undefined,
                  )
                }
                className={smallInputCls}
              />
            </FilterField>
            <FilterField label="To">
              <input
                type="date"
                value={filters.to ? filters.to.slice(0, 10) : ''}
                onChange={(e) =>
                  setParam(
                    'to',
                    e.target.value ? `${e.target.value}T23:59:59Z` : undefined,
                  )
                }
                className={smallInputCls}
              />
            </FilterField>
          </div>
        ) : null}

        {hasActiveFilters ? (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
            <span>{total} match{total === 1 ? '' : 'es'}</span>
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1 text-rose-700 hover:text-rose-900 dark:text-rose-300 dark:hover:text-rose-200"
            >
              <X className="w-3 h-3" aria-hidden />
              Clear filters
            </button>
          </div>
        ) : null}
      </Card>

      {error ? (
        <Card className="p-4">
          <p className="text-sm text-rose-600 dark:text-rose-400">
            Failed to load incidents: {error.message}
          </p>
        </Card>
      ) : null}

      {loading && items.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4 h-24 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileWarning}
            title={hasActiveFilters ? 'No matches' : 'No name crimes logged yet'}
            description={
              hasActiveFilters
                ? 'Try loosening your filters.'
                : 'Either everyone is behaving, or you have not started collecting evidence.'
            }
            action={
              !hasActiveFilters ? (
                <Link
                  to="/new"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-slate-900 text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  <Plus className="w-4 h-4" aria-hidden />
                  Log the first incident
                </Link>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <ul className="space-y-2">
          {items.map((m, i) => (
            <li key={m.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/incidents/${m.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/incidents/${m.id}`);
                  }
                }}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`block cursor-pointer rounded-2xl transition focus:outline-none ${
                  i === selectedIndex
                    ? 'ring-2 ring-rose-300 ring-offset-2 ring-offset-slate-50 dark:ring-rose-700 dark:ring-offset-slate-950'
                    : ''
                }`}
              >
                <Card className="p-4 transition hover:border-slate-300 dark:hover:border-slate-700">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                        <span className="text-rose-700 dark:text-rose-300">
                          "{m.misspelledName}"
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 font-normal">
                          {' '}
                          instead of{' '}
                        </span>
                        <span>"{m.correctName}"</span>
                      </p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 truncate">
                        By{' '}
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {m.offenderName}
                        </span>
                        {m.offenderHandle ? (
                          <span className="text-slate-400 dark:text-slate-500">
                            {' '}
                            ({m.offenderHandle})
                          </span>
                        ) : null}
                        {m.source ? (
                          <span className="text-slate-400 dark:text-slate-500">
                            {' '}
                            · {m.source}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 line-clamp-1">
                        {m.context}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <EditDistanceBadge distance={m.editDistance} />
                      <span
                        className="text-xs text-slate-400 dark:text-slate-500"
                        title={m.occurredAt}
                      >
                        {formatRelative(m.occurredAt)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-1">
                    <Link
                      to={`/incidents/${m.id}/edit`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 rounded-md text-slate-500 transition hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800"
                      aria-label="Edit"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" aria-hidden />
                    </Link>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingDelete({
                          id: m.id,
                          label: `"${m.misspelledName}" by ${m.offenderName}`,
                        });
                      }}
                      className="p-1.5 rounded-md text-slate-500 transition hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/30"
                      aria-label="Delete"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden />
                    </button>
                  </div>
                </Card>
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
          <p>
            Page {filters.page} of {totalPages} · {total} incident
            {total === 1 ? '' : 's'}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={filters.page <= 1}
              onClick={() => setPage(filters.page - 1)}
              className="p-1.5 rounded-md border border-slate-200 bg-white transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden />
            </button>
            <button
              type="button"
              disabled={filters.page >= totalPages}
              onClick={() => setPage(filters.page + 1)}
              className="p-1.5 rounded-md border border-slate-200 bg-white transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" aria-hidden />
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this incident?"
        description={
          pendingDelete
            ? `Removing ${pendingDelete.label} also wipes its attachments. There is no undo.`
            : ''
        }
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
