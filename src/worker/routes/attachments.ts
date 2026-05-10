import { Hono } from 'hono';
import type { Env } from '../env';
import { errorResponse } from '../errors';
import { toAttachment, type AttachmentRow } from '../db';
import {
  ALLOWED_IMAGE_MIME,
  MAX_ATTACHMENT_BYTES,
  type Attachment,
} from '../../shared/types';
import { requireAuth, type AuthVariables } from '../auth/middleware';

const mimeToExt: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export function isAllowedMime(mime: string): boolean {
  return ALLOWED_IMAGE_MIME.includes(mime);
}

export function isWithinSize(bytes: number): boolean {
  return bytes <= MAX_ATTACHMENT_BYTES;
}

export async function storeImage(
  env: Env,
  misspellingId: string,
  file: File,
  caption: string | null,
): Promise<Attachment> {
  const ext = mimeToExt[file.type] ?? 'bin';
  const id = crypto.randomUUID();
  const key = `att/${id}.${ext}`;
  await env.UPLOADS.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO attachments (id, misspelling_id, kind, url, storage_key, mime_type, size_bytes, caption, created_at)
     VALUES (?, ?, 'image', NULL, ?, ?, ?, ?, ?)`,
  )
    .bind(id, misspellingId, key, file.type, file.size, caption, now)
    .run();
  return toAttachment({
    id,
    misspelling_id: misspellingId,
    kind: 'image',
    url: null,
    storage_key: key,
    mime_type: file.type,
    size_bytes: file.size,
    caption,
    created_at: now,
  });
}

export async function storeLink(
  env: Env,
  misspellingId: string,
  url: string,
  caption: string | null,
): Promise<Attachment> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO attachments (id, misspelling_id, kind, url, storage_key, mime_type, size_bytes, caption, created_at)
     VALUES (?, ?, 'link', ?, NULL, NULL, NULL, ?, ?)`,
  )
    .bind(id, misspellingId, url, caption, now)
    .run();
  return toAttachment({
    id,
    misspelling_id: misspellingId,
    kind: 'link',
    url,
    storage_key: null,
    mime_type: null,
    size_bytes: null,
    caption,
    created_at: now,
  });
}

export async function deleteAttachmentImagesFor(
  env: Env,
  misspellingId: string,
): Promise<void> {
  const { results } = await env.DB.prepare(
    "SELECT storage_key FROM attachments WHERE misspelling_id = ? AND kind = 'image' AND storage_key IS NOT NULL",
  )
    .bind(misspellingId)
    .all<{ storage_key: string }>();
  await Promise.all(
    results.map((r) => env.UPLOADS.delete(r.storage_key).catch(() => undefined)),
  );
}

const attachments = new Hono<{ Bindings: Env; Variables: AuthVariables }>();
attachments.use('*', requireAuth);

attachments.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const row = await c.env.DB.prepare('SELECT * FROM attachments WHERE id = ?')
    .bind(id)
    .first<AttachmentRow>();
  if (!row) return errorResponse(c, 'Attachment not found', 'NOT_FOUND', 404);
  if (row.kind === 'image' && row.storage_key) {
    await c.env.UPLOADS.delete(row.storage_key).catch(() => undefined);
  }
  await c.env.DB.prepare('DELETE FROM attachments WHERE id = ?').bind(id).run();
  return c.body(null, 204);
});

export default attachments;

export const uploads = new Hono<{ Bindings: Env; Variables: AuthVariables }>();
uploads.use('*', requireAuth);

uploads.get('/*', async (c) => {
  const key = c.req.path.replace(/^\/uploads\//, '');
  if (!key || !key.startsWith('att/')) {
    return errorResponse(c, 'Not found', 'NOT_FOUND', 404);
  }
  const obj = await c.env.UPLOADS.get(key);
  if (!obj) return errorResponse(c, 'Not found', 'NOT_FOUND', 404);
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'private, max-age=31536000, immutable');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('etag', obj.httpEtag);
  return new Response(obj.body, { headers });
});
