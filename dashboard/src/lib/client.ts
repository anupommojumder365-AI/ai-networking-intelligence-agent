'use client';

export class ApiError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

export async function fetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  if (res.status === 401 && typeof window !== 'undefined') {
    window.location.href = '/login';
    throw new ApiError(401, 'unauthorized');
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(res.status, body.error ?? 'request_failed');
  }
  return (await res.json()) as T;
}

export async function send<T = unknown>(url: string, method: 'POST' | 'PATCH', body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? 'request_failed');
  return data;
}

const ERROR_TEXT: Record<string, string> = {
  run_in_progress: 'A research run is already in progress.',
  not_running: 'No research is running.',
  gateway_unreachable: 'n8n gateway is unreachable.',
  gateway_rejected_secret: 'n8n rejected the gateway secret. Check N8N_GATEWAY_SECRET.',
  gateway_error: 'n8n gateway returned an error.',
  invalid_transition: 'That status change is not allowed from the current state.',
  too_many_attempts: 'Too many attempts. Try again later.',
  invalid_credentials: 'Incorrect password.',
  server_error: 'Server error. Check the deployment logs.',
};

export function errorText(e: unknown): string {
  if (e instanceof ApiError) return ERROR_TEXT[e.code] ?? e.code;
  return 'Something went wrong.';
}
