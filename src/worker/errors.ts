import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'INTERNAL_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'INVITE_REQUIRED'
  | 'INVITE_INVALID';

export function errorResponse(
  c: Context,
  message: string,
  code: ErrorCode,
  status: ContentfulStatusCode,
) {
  return c.json({ error: { message, code } }, status);
}
