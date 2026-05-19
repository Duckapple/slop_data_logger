import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Calendar,
  AtSign,
  Tag,
  Quote,
  StickyNote,
  Paperclip,
  UserPen,
} from 'lucide-react';
import { displayName } from '../lib/auth';
import { Card } from '../components/Card';
import { EditDistanceBadge } from '../components/EditDistanceBadge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { AttachmentManager } from '../components/AttachmentManager';
import { useApi } from '../hooks/useApi';
import {
  useKeyboardShortcut,
  type Shortcut,
} from '../hooks/useKeyboardShortcut';
import { api } from '../lib/api';
import { formatDateTime, formatRelative } from '../lib/format';

export default function IncidentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data, error, loading, refetch } = useApi(
    () => api.get(id!),
    [id],
  );

  useEffect(() => {
    if (!data) {
      document.title = 'Incident · Name Crimes';
      return;
    }
    const offender = data.isOwn ? (data.offenderName ?? '—') : 'Private';
    document.title = `"${data.misspelledName}" by ${offender} · Name Crimes`;
  }, [data]);

  const isOwn = data?.isOwn ?? false;

  const shortcuts = useMemo<Shortcut[]>(
    () => [
      ...(isOwn
        ? [
            {
              key: 'e',
              description: 'Edit incident',
              handler: () => {
                if (id) navigate(`/incidents/${id}/edit`);
              },
            } satisfies Shortcut,
          ]
        : []),
      {
        key: 'Backspace',
        description: 'Back to list',
        handler: () => navigate('/incidents'),
      },
    ],
    [id, navigate, isOwn],
  );
  useKeyboardShortcut(shortcuts);

  async function handleDelete() {
    if (!id) return;
    setDeleting(true);
    try {
      await api.remove(id);
      navigate('/incidents', { replace: true });
    } catch {
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Card className="p-6 h-40 animate-pulse" />
        <Card className="p-6 h-40 animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-6">
        <p className="text-sm text-rose-600 dark:text-rose-400">
          {error?.message ?? 'Incident not found'}
        </p>
        <Link
          to="/incidents"
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden /> Back to incidents
        </Link>
      </Card>
    );
  }

  const m = data;
  const attachments = m.attachments ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <Link
          to="/incidents"
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden /> Back to incidents
        </Link>
        {m.isOwn ? (
          <div className="flex gap-1">
            <Link
              to={`/incidents/${m.id}/edit`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Pencil className="w-4 h-4" aria-hidden /> Edit
            </Link>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-rose-200 bg-white text-rose-700 transition hover:bg-rose-50 dark:border-rose-900 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-950/30"
            >
              <Trash2 className="w-4 h-4" aria-hidden /> Delete
            </button>
          </div>
        ) : null}
      </div>

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0">
            <p className="text-2xl font-semibold tracking-tight text-slate-900 wrap-break-word dark:text-slate-100">
              <span className="text-rose-700 dark:text-rose-300">
                "{m.misspelledName}"
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-normal">
                {' '}
                instead of{' '}
              </span>
              <span>"{m.correctName}"</span>
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              By{' '}
              {m.isOwn ? (
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {m.offenderName}
                </span>
              ) : (
                <span className="italic text-slate-400 dark:text-slate-500">
                  Private
                </span>
              )}
              {m.isOwn && m.offenderHandle ? (
                <span className="text-slate-400 dark:text-slate-500">
                  {' '}
                  · {m.offenderHandle}
                </span>
              ) : null}
            </p>
          </div>
          <div className="shrink-0">
            <EditDistanceBadge distance={m.editDistance} size="md" />
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <DetailRow icon={Calendar} label="Occurred">
            <span title={m.occurredAt}>
              {formatDateTime(m.occurredAt)}{' '}
              <span className="text-slate-400 dark:text-slate-500">
                ({formatRelative(m.occurredAt)})
              </span>
            </span>
          </DetailRow>
          {m.source ? (
            <DetailRow icon={Tag} label="Source">
              <span>{m.source}</span>
            </DetailRow>
          ) : null}
          {m.offenderHandle ? (
            <DetailRow icon={AtSign} label="Handle">
              <span>{m.offenderHandle}</span>
            </DetailRow>
          ) : null}
          {m.createdBy ? (
            <DetailRow icon={UserPen} label="Logged by">
              <span>
                {displayName(m.createdBy)}{' '}
                <span className="text-slate-400 dark:text-slate-500">
                  · @{m.createdBy.username}
                </span>
              </span>
            </DetailRow>
          ) : null}
        </dl>

        <div className="mt-6 space-y-4">
          <div>
            <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              <Quote className="w-3.5 h-3.5" aria-hidden /> Context
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
              {m.context}
            </p>
          </div>
          {m.notes ? (
            <div>
              <h3 className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                <StickyNote className="w-3.5 h-3.5" aria-hidden /> Notes
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {m.notes}
              </p>
            </div>
          ) : null}
        </div>
      </Card>

      {m.isOwn ? (
        <Card className="p-6">
          <h3 className="flex items-center gap-1.5 text-base font-semibold text-slate-900 dark:text-slate-100">
            <Paperclip
              className="w-4 h-4 text-slate-500 dark:text-slate-400"
              aria-hidden
            />{' '}
            Spelling evidence
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Drop a screenshot or paste a link. Anything to back up the case.
          </p>
          <div className="mt-4">
            <AttachmentManager
              misspellingId={m.id}
              attachments={attachments}
              onChange={() => void refetch()}
            />
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <h3 className="flex items-center gap-1.5 text-base font-semibold text-slate-900 dark:text-slate-100">
            <Paperclip
              className="w-4 h-4 text-slate-500 dark:text-slate-400"
              aria-hidden
            />{' '}
            Spelling evidence
          </h3>
          <p className="mt-1 text-sm italic text-slate-400 dark:text-slate-500">
            Private to the uploader.
          </p>
        </Card>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this incident?"
        description="The typo will be wiped from the record, along with any attached evidence. There is no undo."
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Calendar;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <Icon className="w-3.5 h-3.5" aria-hidden /> {label}
      </dt>
      <dd className="mt-1 text-slate-700 dark:text-slate-300">{children}</dd>
    </div>
  );
}
