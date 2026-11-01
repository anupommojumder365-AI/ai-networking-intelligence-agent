// Edge-safe (Web Crypto) session helpers. Used by middleware and route handlers.
export const SESSION_COOKIE = 'nis_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const enc = new TextEncoder();

function toB64Url(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return toB64Url(new Uint8Array(sig));
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(secret: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const sig = await hmac(secret, `nis:${exp}`);
  return `${exp}.${sig}`;
}

export async function verifySessionToken(token: string | undefined, secret: string | undefined): Promise<boolean> {
  if (!token || !secret) return false;
  const [expStr, sig] = token.split('.');
  const exp = Number(expStr);
  if (!sig || !Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = await hmac(secret, `nis:${exp}`);
  return safeEqual(sig, expected);
}
