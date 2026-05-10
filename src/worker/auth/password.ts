import { fromB64Url, randomBytes, timingSafeEqual, toB64Url } from './encoding';

// Cloudflare Workers' Web Crypto caps PBKDF2 iterations at 100,000.
// The iteration count is stored in the hash, so we can raise it later if the
// platform lifts the cap or we move to a different algorithm.
const ITERATIONS = 100_000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const hash = await pbkdf2(password, salt, ITERATIONS, KEY_BYTES);
  return `pbkdf2$${ITERATIONS}$${toB64Url(salt)}$${toB64Url(hash)}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;
  let salt: Uint8Array;
  let expected: Uint8Array;
  try {
    salt = fromB64Url(parts[2]);
    expected = fromB64Url(parts[3]);
  } catch {
    return false;
  }
  const got = await pbkdf2(password, salt, iterations, expected.length);
  return timingSafeEqual(got, expected);
}

async function pbkdf2(
  password: string,
  salt: Uint8Array,
  iterations: number,
  keyBytes: number,
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    keyMaterial,
    keyBytes * 8,
  );
  return new Uint8Array(bits);
}
