import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE, SESSION_TTL_SECONDS, createSessionToken, hmac, safeEqual } from '@/lib/auth';
import { env } from '@/lib/env';
import { handle, json } from '@/lib/api';

// Best-effort brute-force throttle (per serverless instance).
const attempts = new Map<string, { n: number; first: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export const POST = handle(async (req: NextRequest) => {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const now = Date.now();
  const rec = attempts.get(ip);
  if (rec && now - rec.first < WINDOW_MS && rec.n >= MAX_ATTEMPTS) {
    return json({ error: 'too_many_attempts' }, 429);
  }

  const body = (await req.json().catch(() => ({}))) as { password?: unknown };
  const password = typeof body.password === 'string' ? body.password : '';

  const secret = env.sessionSecret;
  const [given, expected] = await Promise.all([hmac(secret, password), hmac(secret, env.dashboardPassword)]);
  if (!safeEqual(given, expected)) {
    const fresh = !rec || now - rec.first >= WINDOW_MS;
    attempts.set(ip, { n: fresh ? 1 : rec.n + 1, first: fresh ? now : rec.first });
    return json({ error: 'invalid_credentials' }, 401);
  }

  attempts.delete(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
});
