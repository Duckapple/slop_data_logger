import type { Attachment, Misspelling } from '../shared/types';
import type { ListFilters } from './validation';

export type MisspellingRow = {
  id: string;
  correct_name: string;
  misspelled_name: string;
  offender_name: string;
  offender_handle: string | null;
  context: string;
  source: string | null;
  occurred_at: string;
  edit_distance: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AttachmentRow = {
  id: string;
  misspelling_id: string;
  kind: 'image' | 'link';
  url: string | null;
  storage_key: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  caption: string | null;
  created_at: string;
};

export function toMisspelling(
  row: MisspellingRow,
  attachments?: Attachment[],
): Misspelling {
  return {
    id: row.id,
    correctName: row.correct_name,
    misspelledName: row.misspelled_name,
    offenderName: row.offender_name,
    offenderHandle: row.offender_handle,
    context: row.context,
    source: row.source,
    occurredAt: row.occurred_at,
    editDistance: row.edit_distance,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(attachments ? { attachments } : {}),
  };
}

export function toAttachment(row: AttachmentRow): Attachment {
  const url =
    row.kind === 'image' && row.storage_key
      ? `/uploads/${row.storage_key}`
      : (row.url ?? '');
  return {
    id: row.id,
    misspellingId: row.misspelling_id,
    kind: row.kind,
    url,
    storageKey: row.storage_key,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    caption: row.caption,
    createdAt: row.created_at,
  };
}

export async function fetchAttachmentsFor(
  db: D1Database,
  misspellingId: string,
): Promise<Attachment[]> {
  const { results } = await db
    .prepare(
      'SELECT * FROM attachments WHERE misspelling_id = ? ORDER BY created_at ASC',
    )
    .bind(misspellingId)
    .all<AttachmentRow>();
  return results.map(toAttachment);
}

export async function fetchMisspelling(
  db: D1Database,
  id: string,
): Promise<MisspellingRow | null> {
  return db
    .prepare('SELECT * FROM misspellings WHERE id = ?')
    .bind(id)
    .first<MisspellingRow>();
}

function sortToSql(sort: ListFilters['sort']): string {
  switch (sort) {
    case 'occurredAt_asc':
      return 'ORDER BY occurred_at ASC';
    case 'editDistance_desc':
      return 'ORDER BY edit_distance DESC, occurred_at DESC';
    case 'offender_asc':
      return 'ORDER BY offender_name ASC, occurred_at DESC';
    case 'occurredAt_desc':
    default:
      return 'ORDER BY occurred_at DESC';
  }
}

export type ListQuery = {
  selectSql: string;
  selectBindings: unknown[];
  countSql: string;
  countBindings: unknown[];
};

export function buildListQuery(f: ListFilters): ListQuery {
  const where: string[] = [];
  const bindings: unknown[] = [];

  if (f.q) {
    const like = `%${f.q}%`;
    where.push(
      '(correct_name LIKE ? OR misspelled_name LIKE ? OR offender_name LIKE ? OR COALESCE(offender_handle, \'\') LIKE ? OR context LIKE ? OR COALESCE(notes, \'\') LIKE ?)',
    );
    bindings.push(like, like, like, like, like, like);
  }
  if (f.offender) {
    where.push('offender_name = ?');
    bindings.push(f.offender);
  }
  if (f.misspelledName) {
    where.push('misspelled_name = ?');
    bindings.push(f.misspelledName);
  }
  if (f.source) {
    where.push('source = ?');
    bindings.push(f.source);
  }
  if (f.editDistanceMin != null) {
    where.push('edit_distance >= ?');
    bindings.push(f.editDistanceMin);
  }
  if (f.editDistanceMax != null) {
    where.push('edit_distance <= ?');
    bindings.push(f.editDistanceMax);
  }
  if (f.from) {
    where.push('occurred_at >= ?');
    bindings.push(f.from);
  }
  if (f.to) {
    where.push('occurred_at <= ?');
    bindings.push(f.to);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  return {
    selectSql: `SELECT * FROM misspellings ${whereClause} ${sortToSql(f.sort)} LIMIT ? OFFSET ?`,
    selectBindings: [...bindings, f.limit, f.offset],
    countSql: `SELECT COUNT(*) AS total FROM misspellings ${whereClause}`,
    countBindings: bindings,
  };
}
