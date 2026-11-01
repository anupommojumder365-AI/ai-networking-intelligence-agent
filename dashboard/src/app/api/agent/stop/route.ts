import { handle, json } from '@/lib/api';
import { db } from '@/lib/supabase';
import { getAgentStatus } from '@/lib/data';

export const dynamic = 'force-dynamic';

/** Calls the same RPC as Telegram /stop. The orchestrator checks the flag at its safe checkpoints. */
export const POST = handle(async () => {
  const status = await getAgentStatus();
  if (!status.isRunning) return json({ error: 'not_running' }, 409);

  const { data, error } = await db().rpc('nis_request_stop');
  if (error) throw new Error(`nis_request_stop: ${error.message}`);
  return json({ ok: true, flagged: (data as { running_runs_flagged?: number } | null)?.running_runs_flagged ?? 0 });
});
