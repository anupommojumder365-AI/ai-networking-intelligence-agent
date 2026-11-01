import type { NextRequest } from 'next/server';
import { handle, json } from '@/lib/api';
import { env } from '@/lib/env';
import { db } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIONS = ['reviewed', 'sent', 'connected', 'ignore', 'followup'];

/**
 * Records an activity YOU already performed manually on LinkedIn (same RPC as the Telegram buttons).
 * This never touches LinkedIn.
 */
export const PATCH = handle(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return json({ error: 'invalid_id' }, 400);
  const body = (await req.json().catch(() => ({}))) as { action?: unknown };
  const action = typeof body.action === 'string' ? body.action : '';
  if (!ACTIONS.includes(action)) return json({ error: 'invalid_action' }, 400);

  const { data, error } = await db().rpc('nis_apply_user_action', {
    p_kind: 'person',
    p_id: id,
    p_action: action,
    p_telegram_user_id: env.ownerTelegramId,
  });
  if (error) throw new Error(`nis_apply_user_action: ${error.message}`);
  const result = data as { ok: boolean; error?: string; current?: string; status?: string };
  return json(result, result.ok ? 200 : 409);
});
