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
  created_by_user_id: string | null;
  creator_username: string | null;
  creator_display_name: string | null;
};

const MISSPELLING_SELECT = `
  m.id, m.correct_name, m.misspelled_name, m.offender_name, m.offender_handle,
  m.context, m.source, m.occurred_at, m.edit_distance, m.notes,
  m.created_at, m.updated_at, m.created_by_user_id,
  u.username AS creator_username,
  u.display_name AS creator_display_name
`;

const MISSPELLING_FROM = `
  FROM misspellings m
  LEFT JOIN users u ON u.id = m.created_by_user_id
`;

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
  viewerUserId: string,
  attachments?: Attachment[],
): Misspelling {
  const createdBy =
    row.created_by_user_id && row.creator_username
      ? {
          id: row.created_by_user_id,
          username: row.creator_username,
          displayName: row.creator_display_name,
        }
      : null;
  const isOwn = row.created_by_user_id === viewerUserId;
  return {
    id: row.id,
    correctName: row.correct_name,
    misspelledName: row.misspelled_name,
    offenderName: isOwn ? row.offender_name : null,
    offenderHandle: isOwn ? row.offender_handle : null,
    context: row.context,
    source: isOwn ? row.source : null,
    occurredAt: row.occurred_at,
    editDistance: row.edit_distance,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy,
    isOwn,
    ...(isOwn && attachments ? { attachments } : {}),
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
    .prepare(`SELECT ${MISSPELLING_SELECT} ${MISSPELLING_FROM} WHERE m.id = ?`)
    .bind(id)
    .first<MisspellingRow>();
}

function sortToSql(sort: ListFilters['sort']): string {
  switch (sort) {
    case 'occurredAt_asc':
      return 'ORDER BY m.occurred_at ASC';
    case 'editDistance_desc':
      return 'ORDER BY m.edit_distance DESC, m.occurred_at DESC';
    case 'offender_asc':
      return 'ORDER BY m.offender_name ASC, m.occurred_at DESC';
    case 'occurredAt_desc':
    default:
      return 'ORDER BY m.occurred_at DESC';
  }
}

export type ListQuery = {
  selectSql: string;
  selectBindings: unknown[];
  countSql: string;
  countBindings: unknown[];
};

export function buildListQuery(f: ListFilters, viewerUserId: string): ListQuery {
  const where: string[] = [];
  const bindings: unknown[] = [];

  if (f.q) {
    const like = `%${f.q}%`;
    // Public fields match for any row; private fields (offender, source)
    // only match on rows the viewer owns.
    where.push(
      "(m.correct_name LIKE ? OR m.misspelled_name LIKE ? OR m.context LIKE ? OR COALESCE(m.notes, '') LIKE ? OR (m.created_by_user_id = ? AND (m.offender_name LIKE ? OR COALESCE(m.offender_handle, '') LIKE ? OR COALESCE(m.source, '') LIKE ?)))",
    );
    bindings.push(like, like, like, like, viewerUserId, like, like, like);
  }
  if (f.offender) {
    where.push('m.offender_name = ? AND m.created_by_user_id = ?');
    bindings.push(f.offender, viewerUserId);
  }
  if (f.misspelledName) {
    where.push('m.misspelled_name = ?');
    bindings.push(f.misspelledName);
  }
  if (f.source) {
    where.push('m.source = ? AND m.created_by_user_id = ?');
    bindings.push(f.source, viewerUserId);
  }
  if (f.editDistanceMin != null) {
    where.push('m.edit_distance >= ?');
    bindings.push(f.editDistanceMin);
  }
  if (f.editDistanceMax != null) {
    where.push('m.edit_distance <= ?');
    bindings.push(f.editDistanceMax);
  }
  if (f.from) {
    where.push('m.occurred_at >= ?');
    bindings.push(f.from);
  }
  if (f.to) {
    where.push('m.occurred_at <= ?');
    bindings.push(f.to);
  }

  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  return {
    selectSql: `SELECT ${MISSPELLING_SELECT} ${MISSPELLING_FROM} ${whereClause} ${sortToSql(f.sort)} LIMIT ? OFFSET ?`,
    selectBindings: [...bindings, f.limit, f.offset],
    countSql: `SELECT COUNT(*) AS total ${MISSPELLING_FROM} ${whereClause}`,
    countBindings: bindings,
  };
}
