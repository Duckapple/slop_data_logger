import type {
  Attachment,
  ListResponse,
  Misspelling,
  StatsResponse,
} from '../../shared/types';

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type ErrorEnvelope = { error?: { message?: string; code?: string } };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const ct = res.headers.get('content-type') ?? '';
  const data = ct.includes('application/json')
    ? ((await res.json()) as unknown)
    : null;
  if (!res.ok) {
    const env = (data ?? {}) as ErrorEnvelope;
    const message = env.error?.message ?? `Request failed (${res.status})`;
    const code = env.error?.code ?? 'INTERNAL_ERROR';
    throw new ApiError(message, code, res.status);
  }
  return data as T;
}

async function requestNoBody(url: string, init?: RequestInit): Promise<void> {
  const res = await fetch(url, init);
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let code = 'INTERNAL_ERROR';
    try {
      const data = (await res.json()) as ErrorEnvelope;
      message = data.error?.message ?? message;
      code = data.error?.code ?? code;
    } catch {
      // ignore
    }
    throw new ApiError(message, code, res.status);
  }
}

export type IncidentInput = {
  correctName: string;
  misspelledName: string;
  offenderName: string;
  offenderHandle: string | null;
  context: string;
  source: string | null;
  occurredAt: string;
  notes: string | null;
};

export type ListQuery = {
  q?: string;
  offender?: string;
  misspelledName?: string;
  source?: string;
  editDistanceMin?: number;
  editDistanceMax?: number;
  from?: string;
  to?: string;
  sort?:
    | 'occurredAt_desc'
    | 'occurredAt_asc'
    | 'editDistance_desc'
    | 'offender_asc';
  limit?: number;
  offset?: number;
};

function toQs(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

export const api = {
  list(filters: ListQuery = {}): Promise<ListResponse> {
    return request<ListResponse>(`/api/misspellings${toQs(filters)}`);
  },
  get(id: string): Promise<Misspelling> {
    return request<Misspelling>(`/api/misspellings/${id}`);
  },
  create(body: IncidentInput): Promise<Misspelling> {
    return request<Misspelling>('/api/misspellings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },
  update(id: string, body: IncidentInput): Promise<Misspelling> {
    return request<Misspelling>(`/api/misspellings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  },
  remove(id: string): Promise<void> {
    return requestNoBody(`/api/misspellings/${id}`, { method: 'DELETE' });
  },
  stats(filters: { from?: string; to?: string } = {}): Promise<StatsResponse> {
    return request<StatsResponse>(`/api/stats${toQs(filters)}`);
  },
  uploadImage(
    misspellingId: string,
    file: File,
    caption?: string,
  ): Promise<Attachment> {
    const fd = new FormData();
    fd.append('file', file);
    if (caption) fd.append('caption', caption);
    return request<Attachment>(
      `/api/misspellings/${misspellingId}/attachments`,
      { method: 'POST', body: fd },
    );
  },
  attachLink(
    misspellingId: string,
    url: string,
    caption?: string,
  ): Promise<Attachment> {
    return request<Attachment>(
      `/api/misspellings/${misspellingId}/attachments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'link', url, caption }),
      },
    );
  },
  deleteAttachment(id: string): Promise<void> {
    return requestNoBody(`/api/attachments/${id}`, { method: 'DELETE' });
  },
};
