import type { Context, MiddlewareHandler } from 'hono';
import type { Env } from '../env';
import { errorResponse } from '../errors';
import {
  clearSessionCookie,
  getSessionCookie,
  setSessionCookie,
} from './cookie';
import { lookupSession, maybeSlideSession } from './sessions';

export type AuthUser = {
  id: string;
  username: string;
  displayName: string | null;
};

export type AuthVariables = {
  user: AuthUser;
};

type AuthCtx = Context<{ Bindings: Env; Variables: AuthVariables }>;

async function loadUser(c: AuthCtx): Promise<AuthUser | null> {
  const token = getSessionCookie(c);
  if (!token) return null;
  const session = await lookupSession(c.env, token);
  if (!session) {
    clearSessionCookie(c);
    return null;
  }
  const row = await c.env.DB.prepare(
    'SELECT id, username, display_name FROM users WHERE id = ?',
  )
    .bind(session.user_id)
    .first<{ id: string; username: string; display_name: string | null }>();
  if (!row) {
    clearSessionCookie(c);
    return null;
  }
  const newExpiry = await maybeSlideSession(c.env, session);
  if (newExpiry) {
    setSessionCookie(c, token);
  }
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
  };
}

export const requireAuth: MiddlewareHandler<{
  Bindings: Env;
  Variables: AuthVariables;
}> = async (c, next) => {
  const user = await loadUser(c);
  if (!user) {
    return errorResponse(c, 'Authentication required', 'UNAUTHORIZED', 401);
  }
  c.set('user', user);
  await next();
};
