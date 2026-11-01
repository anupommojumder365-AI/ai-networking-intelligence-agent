import { handle, json } from '@/lib/api';
import { env, envPresence } from '@/lib/env';
import { getIntegrationFacts } from '@/lib/data';

export const dynamic = 'force-dynamic';

/** Probes the gateway with a GET. n8n answers a GET on a POST-only webhook with a "not registered for GET" hint,
 *  which proves the instance is reachable and the webhook is published, without starting anything. */
async function probeGateway(): Promise<{ reachable: boolean; registered: boolean; httpStatus: number | null }> {
  let url: string;
  try {
    url = env.gatewayUrl;
  } catch {
    return { reachable: false, registered: false, httpStatus: null };
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(url, { method: 'GET', signal: ctrl.signal, cache: 'no-store' });
    const text = await res.text();
    return { reachable: true, registered: res.status === 404 && /not registered for GET/i.test(text), httpStatus: res.status };
  } catch {
    return { reachable: false, registered: false, httpStatus: null };
  } finally {
    clearTimeout(timer);
  }
}

export const GET = handle(async () => {
  const [facts, gateway] = await Promise.all([getIntegrationFacts(), probeGateway()]);
  return json({ ...facts, gateway, env: envPresence() });
});
