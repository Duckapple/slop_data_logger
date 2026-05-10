import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { SESSION_TTL_SECONDS } from './sessions';

export const SESSION_COOKIE = 'nm_session';

function isHttps(c: Context): boolean {
  try {
    return new URL(c.req.url).protocol === 'https:';
  } catch {
    return false;
  }
}

export function setSessionCookie(c: Context, token: string): void {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isHttps(c),
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(c: Context): void {
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
}

export function getSessionCookie(c: Context): string | undefined {
  return getCookie(c, SESSION_COOKIE);
}
