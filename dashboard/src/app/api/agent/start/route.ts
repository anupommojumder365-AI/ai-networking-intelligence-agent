import { handle, json } from '@/lib/api';
import { env } from '@/lib/env';
import { getAgentStatus } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * Starts the SAME n8n workflow Telegram /run starts (NIS 02) through the NIS 05 gateway.
 * Duplicate protection: fast pre-check here, authoritative lock inside nis_start_run (Supabase).
 */
export const POST = handle(async () => {
  const status = await getAgentStatus();
  if (status.isRunning && !status.stale) {
    return json({ error: 'run_in_progress', execution_id: status.latest?.execution_id }, 409);
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  let res: Response;
  try {
    res = await fetch(env.gatewayUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-NIS-Secret': env.gatewaySecret },
      body: JSON.stringify({ action: 'run' }),
      signal: ctrl.signal,
      cache: 'no-store',
    });
  } catch (err) {
    console.error('[agent/start] gateway unreachable', err instanceof Error ? err.message : err);
    return json({ error: 'gateway_unreachable' }, 502);
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401) return json({ error: 'gateway_rejected_secret' }, 502);
  if (!res.ok) return json({ error: 'gateway_error', status: res.status }, 502);
  return json({ ok: true, accepted: true }, 202);
});
