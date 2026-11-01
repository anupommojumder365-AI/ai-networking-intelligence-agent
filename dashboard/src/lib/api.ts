import { NextResponse, type NextRequest } from 'next/server';

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

/** Reject cross-site mutating requests (cookie is SameSite=Strict; this is defence in depth). */
export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get('host');
  } catch {
    return false;
  }
}

type Handler<C> = (req: NextRequest, ctx: C) => Promise<Response>;

/** Wraps a route handler: origin check for non-GET, and a safe error response (details stay in server logs). */
export function handle<C = unknown>(fn: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      if (req.method !== 'GET' && !sameOrigin(req)) return json({ error: 'forbidden' }, 403);
      return await fn(req, ctx);
    } catch (err) {
      console.error('[api]', req.method, req.nextUrl.pathname, err instanceof Error ? err.message : err);
      return json({ error: 'server_error' }, 500);
    }
  };
}

export function clampInt(v: string | null, min: number, max: number, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

/** Strip characters that would break a PostgREST `or(...)` filter. */
export function cleanSearch(q: string | null): string {
  return (q ?? '').replace(/[,()%*\\:]/g, ' ').trim().slice(0, 80);
}
