import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, FileWarning } from 'lucide-react';
import { Card } from '../components/Card';
import { EditDistanceBadge } from '../components/EditDistanceBadge';
import { useApi } from '../hooks/useApi';
import { api, ApiError, type IncidentInput } from '../lib/api';
import {
  isoToLocalInput,
  localInputToIso,
  nowLocalInput,
} from '../lib/format';
import { getDefaultCorrectName } from '../lib/storage';

function levenshteinClient(a: string, b: string): number {
  const s = a.toLowerCase();
  const t = b.toLowerCase();
  const m = s.length;
  const n = t.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = s.charCodeAt(i - 1) === t.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

const inputCls =
  'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-rose-600/40';

type FormState = {
  correctName: string;
  misspelledName: string;
  offenderName: string;
  offenderHandle: string;
  context: string;
  source: string;
  occurredAtLocal: string;
  notes: string;
};

const emptyForm = (): FormState => ({
  correctName: getDefaultCorrectName(),
  misspelledName: '',
  offenderName: '',
  offenderHandle: '',
  context: '',
  source: '',
  occurredAtLocal: nowLocalInput(),
  notes: '',
});

export default function IncidentForm({ mode }: { mode: 'create' | 'edit' }) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    document.title =
      mode === 'create' ? 'Log a name crime · Name Crimes' : 'Edit · Name Crimes';
  }, [mode]);

  const isEdit = mode === 'edit';
  const { data: existing, error: loadError, loading: loadLoading } = useApi(
    () => (isEdit && id ? api.get(id) : Promise.resolve(null)),
    [isEdit, id],
  );

  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit && existing) {
      if (!existing.isOwn) {
        navigate(`/incidents/${existing.id}`, { replace: true });
        return;
      }
      setForm({
        correctName: existing.correctName,
        misspelledName: existing.misspelledName,
        offenderName: existing.offenderName ?? '',
        offenderHandle: existing.offenderHandle ?? '',
        context: existing.context,
        source: existing.source ?? '',
        occurredAtLocal: isoToLocalInput(existing.occurredAt),
        notes: existing.notes ?? '',
      });
    }
  }, [isEdit, existing, navigate]);

  const livePreview = useMemo(() => {
    if (!form.correctName.trim() || !form.misspelledName.trim()) return null;
    const same =
      form.correctName.trim().toLowerCase() ===
      form.misspelledName.trim().toLowerCase();
    if (same) return null;
    return levenshteinClient(form.misspelledName.trim(), form.correctName.trim());
  }, [form.correctName, form.misspelledName]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function buildPayload(): IncidentInput {
    return {
      correctName: form.correctName.trim(),
      misspelledName: form.misspelledName.trim(),
      offenderName: form.offenderName.trim(),
      offenderHandle: form.offenderHandle.trim() || null,
      context: form.context.trim(),
      source: form.source.trim() || null,
      occurredAt: localInputToIso(form.occurredAtLocal),
      notes: form.notes.trim() || null,
    };
  }

  function clientValidate(): string | null {
    const payload = buildPayload();
    if (!payload.correctName) return 'Correct name is required';
    if (!payload.misspelledName) return 'Misspelled name is required';
    if (!payload.offenderName) return 'Offender name is required';
    if (!payload.context) return 'Context is required';
    if (!payload.occurredAt) return 'Occurred-at date is required';
    if (
      payload.misspelledName.toLowerCase() ===
      payload.correctName.toLowerCase()
    ) {
      return 'Misspelled name must differ from correct name';
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    const validationError = clientValidate();
    if (validationError) {
      setSaveError(validationError);
      return;
    }
    setSubmitting(true);
    try {
      const payload = buildPayload();
      const saved = isEdit && id
        ? await api.update(id, payload)
        : await api.create(payload);
      navigate(`/incidents/${saved.id}`, { replace: true });
    } catch (err) {
      setSaveError(
        err instanceof ApiError ? err.message : 'Failed to save incident',
      );
      setSubmitting(false);
    }
  }

  if (isEdit && loadLoading && !existing) {
    return <Card className="p-6 h-64 animate-pulse" />;
  }

  if (isEdit && loadError) {
    return (
      <Card className="p-6">
        <p className="text-sm text-rose-600 dark:text-rose-400">
          {loadError.message}
        </p>
        <Link
          to="/incidents"
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden /> Back to incidents
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <Link
          to={isEdit && id ? `/incidents/${id}` : '/incidents'}
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden /> Back
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {isEdit ? 'Edit incident' : 'Log a name crime'}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {isEdit
            ? 'Refine the record. Truth is in the details.'
            : 'Fill in the evidence. Severity is computed for you.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Card className="p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Correct name"
              required
              value={form.correctName}
              onChange={(v) => setField('correctName', v)}
              placeholder="Nicolai"
            />
            <Field
              label="Misspelled name"
              required
              value={form.misspelledName}
              onChange={(v) => setField('misspelledName', v)}
              placeholder="Nikolai"
            />
          </div>
          {livePreview != null ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Live edit distance:</span>
              <EditDistanceBadge distance={livePreview} />
              <span className="text-slate-400 dark:text-slate-500">
                (server-computed value will be saved with the incident)
              </span>
            </div>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Offender name"
              required
              value={form.offenderName}
              onChange={(v) => setField('offenderName', v)}
              placeholder="HR Portal, Slackbot, Aunt Jeanie…"
            />
            <Field
              label="Offender handle"
              value={form.offenderHandle}
              onChange={(v) => setField('offenderHandle', v)}
              placeholder="@username (optional)"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Source"
              value={form.source}
              onChange={(v) => setField('source', v)}
              placeholder="Email, Slack, Calendar… (optional)"
            />
            <label className="block">
              <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Occurred at{' '}
                <span className="text-rose-600 dark:text-rose-400">*</span>
              </span>
              <input
                type="datetime-local"
                required
                value={form.occurredAtLocal}
                onChange={(e) => setField('occurredAtLocal', e.target.value)}
                className={inputCls}
              />
            </label>
          </div>

          <Field
            label="Context"
            required
            value={form.context}
            onChange={(v) => setField('context', v)}
            placeholder="Where it happened, what was said"
            multiline
          />
          <Field
            label="Notes"
            value={form.notes}
            onChange={(v) => setField('notes', v)}
            placeholder="Personal commentary, follow-ups… (optional)"
            multiline
          />

          {saveError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300"
            >
              <FileWarning className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
              <span>{saveError}</span>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Attachments can be added on the incident page after saving.
            </p>
            <div className="flex gap-2">
              <Link
                to={isEdit && id ? `/incidents/${id}` : '/incidents'}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-slate-900 text-white transition hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                <Save className="w-4 h-4" aria-hidden />
                {submitting
                  ? 'Saving…'
                  : isEdit
                    ? 'Save changes'
                    : 'Enter into evidence'}
              </button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        {label}{' '}
        {required ? (
          <span className="text-rose-600 dark:text-rose-400">*</span>
        ) : null}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          rows={3}
          className={inputCls}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={inputCls}
        />
      )}
    </label>
  );
}
