import { handle, json } from '@/lib/api';
import { getOpportunities } from '@/lib/data';

export const dynamic = 'force-dynamic';

export const GET = handle(async () => json(await getOpportunities()));
