import { Hono } from 'hono';
import type { Env } from '../env';
import { errorResponse } from '../errors';
import { firstZodError } from '../validation';
import { hashPassword, verifyPassword } from '../auth/password';
import {
  issueSession,
  revokeAllSessionsForUser,
  revokeSession,
} from '../auth/sessions';
import {
  clearSessionCookie,
  getSessionCookie,
  setSessionCookie,
} from '../auth/cookie';
import { requireAuth, type AuthVariables } from '../auth/middleware';
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from '../auth/validation';

const MIN_LOGIN_RESPONSE_MS = 400;

type UserRow = {
  id: string;
  username: string;
  display_name: string | null;
  password_hash: string;
};

function publicUser(row: { id: string; username: string; display_name: string | null }) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
  };
}

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.get('/bootstrap-status', async (c) => {
  const row = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM users')
    .first<{ n: number }>();
  return c.json({ open: (row?.n ?? 0) === 0 });
});

app.post('/register', async (c) => {
  const json = await c.req.json().catch(() => null);
  if (!json) return errorResponse(c, 'Invalid JSON body', 'VALIDATION_ERROR', 400);
  const parsed = registerSchema.safeParse(json);
  if (!parsed.success) {
    return errorResponse(c, firstZodError(parsed.error), 'VALIDATION_ERROR', 400);
  }
  const { username, password, displayName, inviteCode } = parsed.data;

  const now = new Date().toISOString();
  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);

  // Atomic bootstrap: only inserts if the users table is still empty. If two
  // concurrent registers race on an empty DB, exactly one of these statements
  // will affect a row; the loser falls through to the invite-required path.
  let wonBootstrap = false;
  try {
    const r = await c.env.DB.prepare(
      `INSERT INTO users (id, username, display_name, password_hash, created_at, updated_at)
       SELECT ?, ?, ?, ?, ?, ?
       WHERE NOT EXISTS (SELECT 1 FROM users)`,
    )
      .bind(userId, username, displayName ?? null, passwordHash, now, now)
      .run();
    wonBootstrap = (r.meta?.changes ?? 0) > 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/UNIQUE|constraint/i.test(msg)) throw err;
    // Username collision on an empty table — vanishingly unlikely, but treat
    // it the same as the post-bootstrap conflict path below.
    return errorResponse(c, 'Username is already taken', 'CONFLICT', 409);
  }

  if (wonBootstrap) {
    await c.env.DB.prepare(
      'UPDATE misspellings SET created_by_user_id = ? WHERE created_by_user_id IS NULL',
    )
      .bind(userId)
      .run();
  } else {
    if (!inviteCode) {
      return errorResponse(
        c,
        'An invite code is required to register',
        'INVITE_REQUIRED',
        403,
      );
    }
    const invite = await c.env.DB.prepare(
      'SELECT code FROM invites WHERE code = ? AND consumed_at IS NULL AND expires_at > ?',
    )
      .bind(inviteCode, now)
      .first();
    if (!invite) {
      return errorResponse(
        c,
        'This invite is invalid or has expired',
        'INVITE_INVALID',
        403,
      );
    }

    try {
      await c.env.DB.prepare(
        `INSERT INTO users (id, username, display_name, password_hash, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
        .bind(userId, username, displayName ?? null, passwordHash, now, now)
        .run();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/UNIQUE|constraint/i.test(msg)) {
        return errorResponse(c, 'Username is already taken', 'CONFLICT', 409);
      }
      throw err;
    }

    const consume = await c.env.DB.prepare(
      `UPDATE invites SET consumed_at = ?, consumed_by = ?
       WHERE code = ? AND consumed_at IS NULL AND expires_at > ?`,
    )
      .bind(now, userId, inviteCode, now)
      .run();
    if ((consume.meta?.changes ?? 0) === 0) {
      // Race: invite consumed between our pre-check and now. Compensate.
      await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
      return errorResponse(
        c,
        'This invite is invalid or has expired',
        'INVITE_INVALID',
        403,
      );
    }
  }

  const userAgent = c.req.header('user-agent') ?? null;
  const ip =
    c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? null;
  const { token } = await issueSession(c.env, userId, { userAgent, ip });
  setSessionCookie(c, token);

  return c.json(
    {
      user: { id: userId, username, displayName: displayName ?? null },
    },
    201,
  );
});

app.post('/login', async (c) => {
  const startedAt = Date.now();
  const json = await c.req.json().catch(() => null);
  if (!json) return errorResponse(c, 'Invalid JSON body', 'VALIDATION_ERROR', 400);
  const parsed = loginSchema.safeParse(json);
  if (!parsed.success) {
    return errorResponse(c, firstZodError(parsed.error), 'VALIDATION_ERROR', 400);
  }
  const { username, password } = parsed.data;

  const row = await c.env.DB.prepare(
    'SELECT id, username, display_name, password_hash FROM users WHERE username = ?',
  )
    .bind(username)
    .first<UserRow>();

  // Always run a hash comparison to keep timing similar between hits and misses.
  const ok =
    !!row && (await verifyPassword(password, row.password_hash));

  // Pad to the minimum response time to dampen timing oracles.
  const elapsed = Date.now() - startedAt;
  if (elapsed < MIN_LOGIN_RESPONSE_MS) {
    await new Promise((r) => setTimeout(r, MIN_LOGIN_RESPONSE_MS - elapsed));
  }

  if (!ok || !row) {
    return errorResponse(
      c,
      'Incorrect username or password',
      'UNAUTHORIZED',
      401,
    );
  }

  const userAgent = c.req.header('user-agent') ?? null;
  const ip =
    c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? null;
  const { token } = await issueSession(c.env, row.id, { userAgent, ip });
  setSessionCookie(c, token);

  return c.json({ user: publicUser(row) });
});

app.post('/logout', async (c) => {
  const token = getSessionCookie(c);
  if (token) {
    await revokeSession(c.env, token);
  }
  clearSessionCookie(c);
  return c.body(null, 204);
});

const authed = new Hono<{ Bindings: Env; Variables: AuthVariables }>();
authed.use('*', requireAuth);

authed.get('/me', (c) => c.json({ user: c.get('user') }));

authed.post('/logout-all', async (c) => {
  const user = c.get('user');
  const removed = await revokeAllSessionsForUser(c.env, user.id);
  clearSessionCookie(c);
  return c.json({ removed });
});

authed.patch('/me', async (c) => {
  const user = c.get('user');
  const json = await c.req.json().catch(() => null);
  if (!json) return errorResponse(c, 'Invalid JSON body', 'VALIDATION_ERROR', 400);
  const parsed = updateProfileSchema.safeParse(json);
  if (!parsed.success) {
    return errorResponse(c, firstZodError(parsed.error), 'VALIDATION_ERROR', 400);
  }
  const { displayName } = parsed.data;
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?',
  )
    .bind(displayName, now, user.id)
    .run();
  return c.json({
    user: { id: user.id, username: user.username, displayName },
  });
});

authed.post('/change-password', async (c) => {
  const user = c.get('user');
  const json = await c.req.json().catch(() => null);
  if (!json) return errorResponse(c, 'Invalid JSON body', 'VALIDATION_ERROR', 400);
  const parsed = changePasswordSchema.safeParse(json);
  if (!parsed.success) {
    return errorResponse(c, firstZodError(parsed.error), 'VALIDATION_ERROR', 400);
  }
  const { currentPassword, newPassword } = parsed.data;
  const row = await c.env.DB.prepare(
    'SELECT password_hash FROM users WHERE id = ?',
  )
    .bind(user.id)
    .first<{ password_hash: string }>();
  if (!row) return errorResponse(c, 'User not found', 'NOT_FOUND', 404);
  const ok = await verifyPassword(currentPassword, row.password_hash);
  if (!ok) {
    return errorResponse(
      c,
      'Current password is incorrect',
      'UNAUTHORIZED',
      401,
    );
  }
  const newHash = await hashPassword(newPassword);
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
  )
    .bind(newHash, now, user.id)
    .run();

  // Invalidate every session (including this request's) and issue a fresh one
  // for the current device so the caller stays signed in.
  await revokeAllSessionsForUser(c.env, user.id);
  const userAgent = c.req.header('user-agent') ?? null;
  const ip =
    c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? null;
  const { token } = await issueSession(c.env, user.id, { userAgent, ip });
  setSessionCookie(c, token);
  return c.body(null, 204);
});

app.route('/', authed);

export default app;
