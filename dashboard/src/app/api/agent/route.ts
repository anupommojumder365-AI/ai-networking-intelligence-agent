import { handle, json } from '@/lib/api';
import { getAgentStatus } from '@/lib/data';

export const dynamic = 'force-dynamic';

export const GET = handle(async () => json(await getAgentStatus()));
