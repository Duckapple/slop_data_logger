import type { Env } from '../env';
import { randomBytes, sha256Hex, toB64Url } from './encoding';

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const SLIDING_REFRESH_THRESHOLD_SECONDS = 60 * 60 * 24 * 7; // refresh if < 7d remaining

export type SessionRecord = {
  id: string;
  user_id: string;
  expires_at: string;
};

export async function issueSession(
  env: Env,
  userId: string,
  meta: { userAgent?: string | null; ip?: string | null } = {},
): Promise<{ token: string; expiresAt: Date }> {
  const token = toB64Url(randomBytes(32));
  const id = await sha256Hex(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, created_at, expires_at, user_agent, ip)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      userId,
      now.toISOString(),
      expiresAt.toISOString(),
      meta.userAgent ?? null,
      meta.ip ?? null,
    )
    .run();
  return { token, expiresAt };
}

export async function lookupSession(
  env: Env,
  token: string,
): Promise<SessionRecord | null> {
  const id = await sha256Hex(token);
  const row = await env.DB.prepare(
    'SELECT id, user_id, expires_at FROM sessions WHERE id = ? AND expires_at > ?',
  )
    .bind(id, new Date().toISOString())
    .first<SessionRecord>();
  return row ?? null;
}

export async function maybeSlideSession(
  env: Env,
  session: SessionRecord,
): Promise<Date | null> {
  const expires = new Date(session.expires_at).getTime();
  const now = Date.now();
  const remainingSec = (expires - now) / 1000;
  if (remainingSec > SLIDING_REFRESH_THRESHOLD_SECONDS) return null;
  const newExpiresAt = new Date(now + SESSION_TTL_SECONDS * 1000);
  await env.DB.prepare('UPDATE sessions SET expires_at = ? WHERE id = ?')
    .bind(newExpiresAt.toISOString(), session.id)
    .run();
  return newExpiresAt;
}

export async function revokeSession(env: Env, token: string): Promise<void> {
  const id = await sha256Hex(token);
  await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(id).run();
}

export async function revokeAllSessionsForUser(
  env: Env,
  userId: string,
): Promise<number> {
  const result = await env.DB.prepare(
    'DELETE FROM sessions WHERE user_id = ?',
  )
    .bind(userId)
    .run();
  return result.meta?.changes ?? 0;
}
