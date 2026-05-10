import { Hono } from 'hono';
import type { Env } from '../env';
import { errorResponse } from '../errors';
import { firstZodError } from '../validation';
import { requireAuth, type AuthVariables } from '../auth/middleware';
import { createInviteSchema } from '../auth/validation';
import { randomBytes, toB64Url } from '../auth/encoding';

type InviteRow = {
  code: string;
  created_by: string;
  note: string | null;
  created_at: string;
  expires_at: string;
  consumed_at: string | null;
  consumed_by: string | null;
  inviter_username: string | null;
  inviter_display_name: string | null;
  consumer_username: string | null;
  consumer_display_name: string | null;
};

function toInvite(row: InviteRow, origin: string) {
  return {
    code: row.code,
    note: row.note,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    consumedAt: row.consumed_at,
    url: `${origin}/invite/${row.code}`,
    createdBy: {
      username: row.inviter_username ?? '',
      displayName: row.inviter_display_name,
    },
    consumedBy:
      row.consumed_by && row.consumer_username
        ? {
            username: row.consumer_username,
            displayName: row.consumer_display_name,
          }
        : null,
  };
}

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();
app.use('*', requireAuth);

app.post('/', async (c) => {
  const user = c.get('user');
  const json = await c.req.json().catch(() => ({}));
  const parsed = createInviteSchema.safeParse(json);
  if (!parsed.success) {
    return errorResponse(c, firstZodError(parsed.error), 'VALIDATION_ERROR', 400);
  }
  const { note, ttlDays } = parsed.data;
  const code = toB64Url(randomBytes(24));
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000);
  await c.env.DB.prepare(
    `INSERT INTO invites (code, created_by, note, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(code, user.id, note, now.toISOString(), expiresAt.toISOString())
    .run();
  const origin = new URL(c.req.url).origin;
  return c.json(
    {
      code,
      note,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      consumedAt: null,
      url: `${origin}/invite/${code}`,
    },
    201,
  );
});

app.get('/', async (c) => {
  const user = c.get('user');
  const { results } = await c.env.DB.prepare(
    `SELECT
       i.code, i.created_by, i.note, i.created_at, i.expires_at, i.consumed_at, i.consumed_by,
       inviter.username AS inviter_username,
       inviter.display_name AS inviter_display_name,
       consumer.username AS consumer_username,
       consumer.display_name AS consumer_display_name
     FROM invites i
     JOIN users inviter ON inviter.id = i.created_by
     LEFT JOIN users consumer ON consumer.id = i.consumed_by
     WHERE i.created_by = ?
     ORDER BY i.created_at DESC
     LIMIT 100`,
  )
    .bind(user.id)
    .all<InviteRow>();
  const origin = new URL(c.req.url).origin;
  return c.json({ items: results.map((r) => toInvite(r, origin)) });
});

app.delete('/:code', async (c) => {
  const user = c.get('user');
  const code = c.req.param('code');
  const result = await c.env.DB.prepare(
    'DELETE FROM invites WHERE code = ? AND created_by = ? AND consumed_at IS NULL',
  )
    .bind(code, user.id)
    .run();
  if ((result.meta?.changes ?? 0) === 0) {
    return errorResponse(
      c,
      'Invite not found, already consumed, or not yours',
      'NOT_FOUND',
      404,
    );
  }
  return c.body(null, 204);
});

export default app;
