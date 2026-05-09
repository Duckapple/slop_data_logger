import { Hono } from 'hono';
import type { Env } from '../env';
import { errorResponse } from '../errors';
import {
  buildListQuery,
  fetchAttachmentsFor,
  fetchMisspelling,
  toMisspelling,
  type MisspellingRow,
} from '../db';
import { levenshtein } from '../levenshtein';
import {
  firstZodError,
  incidentBodySchema,
  linkAttachmentSchema,
  listFiltersSchema,
} from '../validation';
import {
  deleteAttachmentImagesFor,
  isAllowedMime,
  isWithinSize,
  storeImage,
  storeLink,
} from './attachments';

const misspellings = new Hono<{ Bindings: Env }>();

misspellings.get('/', async (c) => {
  const parsed = listFiltersSchema.safeParse(
    Object.fromEntries(new URL(c.req.url).searchParams),
  );
  if (!parsed.success) {
    return errorResponse(c, firstZodError(parsed.error), 'VALIDATION_ERROR', 400);
  }
  const filters = parsed.data;
  if (
    filters.editDistanceMin != null &&
    filters.editDistanceMax != null &&
    filters.editDistanceMin > filters.editDistanceMax
  ) {
    return errorResponse(
      c,
      'editDistanceMin must be ≤ editDistanceMax',
      'VALIDATION_ERROR',
      400,
    );
  }

  const q = buildListQuery(filters);
  const [list, count] = await Promise.all([
    c.env.DB.prepare(q.selectSql)
      .bind(...q.selectBindings)
      .all<MisspellingRow>(),
    c.env.DB.prepare(q.countSql)
      .bind(...q.countBindings)
      .first<{ total: number }>(),
  ]);

  return c.json({
    items: list.results.map((row) => toMisspelling(row)),
    total: count?.total ?? 0,
  });
});

misspellings.post('/', async (c) => {
  const json = await c.req.json().catch(() => null);
  if (!json) {
    return errorResponse(c, 'Invalid JSON body', 'VALIDATION_ERROR', 400);
  }
  const parsed = incidentBodySchema.safeParse(json);
  if (!parsed.success) {
    return errorResponse(c, firstZodError(parsed.error), 'VALIDATION_ERROR', 400);
  }
  const body = parsed.data;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const editDistance = levenshtein(body.misspelledName, body.correctName);

  await c.env.DB.prepare(
    `INSERT INTO misspellings
       (id, correct_name, misspelled_name, offender_name, offender_handle, context, source, occurred_at, edit_distance, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      body.correctName,
      body.misspelledName,
      body.offenderName,
      body.offenderHandle,
      body.context,
      body.source,
      body.occurredAt,
      editDistance,
      body.notes,
      now,
      now,
    )
    .run();

  const row = await fetchMisspelling(c.env.DB, id);
  if (!row) {
    return errorResponse(c, 'Failed to read back inserted incident', 'INTERNAL_ERROR', 500);
  }
  return c.json(toMisspelling(row, []), 201);
});

misspellings.get('/:id', async (c) => {
  const id = c.req.param('id');
  const row = await fetchMisspelling(c.env.DB, id);
  if (!row) return errorResponse(c, 'Incident not found', 'NOT_FOUND', 404);
  const attachments = await fetchAttachmentsFor(c.env.DB, id);
  return c.json(toMisspelling(row, attachments));
});

misspellings.put('/:id', async (c) => {
  const id = c.req.param('id');
  const existing = await fetchMisspelling(c.env.DB, id);
  if (!existing) return errorResponse(c, 'Incident not found', 'NOT_FOUND', 404);

  const json = await c.req.json().catch(() => null);
  if (!json) return errorResponse(c, 'Invalid JSON body', 'VALIDATION_ERROR', 400);
  const parsed = incidentBodySchema.safeParse(json);
  if (!parsed.success) {
    return errorResponse(c, firstZodError(parsed.error), 'VALIDATION_ERROR', 400);
  }
  const body = parsed.data;
  const now = new Date().toISOString();
  const editDistance = levenshtein(body.misspelledName, body.correctName);

  await c.env.DB.prepare(
    `UPDATE misspellings SET
       correct_name = ?,
       misspelled_name = ?,
       offender_name = ?,
       offender_handle = ?,
       context = ?,
       source = ?,
       occurred_at = ?,
       edit_distance = ?,
       notes = ?,
       updated_at = ?
     WHERE id = ?`,
  )
    .bind(
      body.correctName,
      body.misspelledName,
      body.offenderName,
      body.offenderHandle,
      body.context,
      body.source,
      body.occurredAt,
      editDistance,
      body.notes,
      now,
      id,
    )
    .run();

  const updated = await fetchMisspelling(c.env.DB, id);
  const attachments = await fetchAttachmentsFor(c.env.DB, id);
  return c.json(toMisspelling(updated!, attachments));
});

misspellings.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const existing = await fetchMisspelling(c.env.DB, id);
  if (!existing) return errorResponse(c, 'Incident not found', 'NOT_FOUND', 404);
  await deleteAttachmentImagesFor(c.env, id);
  await c.env.DB.prepare('DELETE FROM misspellings WHERE id = ?').bind(id).run();
  return c.body(null, 204);
});

misspellings.get('/:id/attachments', async (c) => {
  const id = c.req.param('id');
  const existing = await fetchMisspelling(c.env.DB, id);
  if (!existing) return errorResponse(c, 'Incident not found', 'NOT_FOUND', 404);
  const attachments = await fetchAttachmentsFor(c.env.DB, id);
  return c.json(attachments);
});

misspellings.post('/:id/attachments', async (c) => {
  const id = c.req.param('id');
  const existing = await fetchMisspelling(c.env.DB, id);
  if (!existing) return errorResponse(c, 'Incident not found', 'NOT_FOUND', 404);

  const ct = (c.req.header('content-type') ?? '').toLowerCase();
  if (ct.includes('multipart/form-data')) {
    const form = await c.req.parseBody();
    const file = form['file'];
    if (!(file instanceof File)) {
      return errorResponse(c, 'Missing "file" field in form data', 'VALIDATION_ERROR', 400);
    }
    if (!isWithinSize(file.size)) {
      return errorResponse(c, 'Image must be 5 MB or less', 'PAYLOAD_TOO_LARGE', 413);
    }
    if (!isAllowedMime(file.type)) {
      return errorResponse(
        c,
        `MIME type "${file.type}" is not allowed`,
        'UNSUPPORTED_MEDIA_TYPE',
        415,
      );
    }
    const rawCaption = form['caption'];
    const caption =
      typeof rawCaption === 'string' && rawCaption.trim().length > 0
        ? rawCaption.trim()
        : null;
    const att = await storeImage(c.env, id, file, caption);
    return c.json(att, 201);
  }

  const json = await c.req.json().catch(() => null);
  if (!json) return errorResponse(c, 'Invalid JSON body', 'VALIDATION_ERROR', 400);
  const parsed = linkAttachmentSchema.safeParse(json);
  if (!parsed.success) {
    return errorResponse(c, firstZodError(parsed.error), 'VALIDATION_ERROR', 400);
  }
  const att = await storeLink(c.env, id, parsed.data.url, parsed.data.caption);
  return c.json(att, 201);
});

export default misspellings;
