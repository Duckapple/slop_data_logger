import { Hono } from 'hono';
import type { Env } from '../env';
import { toMisspelling, type MisspellingRow } from '../db';

const EXPORT_LIMIT = 10000;

const CSV_COLUMNS: readonly (keyof ReturnType<typeof toMisspelling>)[] = [
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
];

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const exportApp = new Hono<{ Bindings: Env }>();

exportApp.get('/export.json', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM misspellings ORDER BY occurred_at DESC LIMIT ?',
  )
    .bind(EXPORT_LIMIT)
    .all<MisspellingRow>();
  const items = results.map((row) => toMisspelling(row));
  return new Response(JSON.stringify(items, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="name-crimes.json"',
    },
  });
});

exportApp.get('/export.csv', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM misspellings ORDER BY occurred_at DESC LIMIT ?',
  )
    .bind(EXPORT_LIMIT)
    .all<MisspellingRow>();

  const lines: string[] = [CSV_COLUMNS.join(',')];
  for (const row of results) {
    const m = toMisspelling(row);
    lines.push(CSV_COLUMNS.map((col) => csvEscape(m[col])).join(','));
  }

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="name-crimes.csv"',
    },
  });
});

export default exportApp;
