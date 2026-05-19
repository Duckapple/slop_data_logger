import { Hono } from 'hono';
import type { Env } from '../env';
import { toMisspelling, type MisspellingRow } from '../db';
import { requireAuth, type AuthVariables } from '../auth/middleware';
import type { Misspelling } from '../../shared/types';

const EXPORT_LIMIT = 10000;

const CSV_HEADERS = [
  'id',
  'correctName',
  'misspelledName',
  'offenderName',
  'offenderHandle',
  'context',
  'source',
  'occurredAt',
  'editDistance',
  'notes',
  'createdAt',
  'updatedAt',
  'createdByUsername',
] as const;

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  let s = String(value);
  // Defuse spreadsheet formula injection: prefix a tab so Excel/Sheets treat
  // the cell as text instead of evaluating it. The tab is invisible in most
  // viewers and stripped by typical CSV parsers.
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `\t${s}`;
  }
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvRow(m: Misspelling): string {
  return [
    m.id,
    m.correctName,
    m.misspelledName,
    m.offenderName,
    m.offenderHandle,
    m.context,
    m.source,
    m.occurredAt,
    m.editDistance,
    m.notes,
    m.createdAt,
    m.updatedAt,
    m.createdBy?.username ?? '',
  ]
    .map(csvEscape)
    .join(',');
}

const exportApp = new Hono<{ Bindings: Env; Variables: AuthVariables }>();
exportApp.use('*', requireAuth);

const EXPORT_SELECT = `
  SELECT
    m.id, m.correct_name, m.misspelled_name, m.offender_name, m.offender_handle,
    m.context, m.source, m.occurred_at, m.edit_distance, m.notes,
    m.created_at, m.updated_at, m.created_by_user_id,
    u.username AS creator_username,
    u.display_name AS creator_display_name
  FROM misspellings m
  LEFT JOIN users u ON u.id = m.created_by_user_id
  ORDER BY m.occurred_at DESC
  LIMIT ?
`;

exportApp.get('/export.json', async (c) => {
  const viewer = c.get('user');
  const { results } = await c.env.DB.prepare(EXPORT_SELECT)
    .bind(EXPORT_LIMIT)
    .all<MisspellingRow>();
  const items = results.map((row) => toMisspelling(row, viewer.id));
  return new Response(JSON.stringify(items, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="name-crimes.json"',
    },
  });
});

exportApp.get('/export.csv', async (c) => {
  const viewer = c.get('user');
  const { results } = await c.env.DB.prepare(EXPORT_SELECT)
    .bind(EXPORT_LIMIT)
    .all<MisspellingRow>();

  const lines: string[] = [CSV_HEADERS.join(',')];
  for (const row of results) {
    lines.push(csvRow(toMisspelling(row, viewer.id)));
  }

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="name-crimes.csv"',
    },
  });
});

export default exportApp;
