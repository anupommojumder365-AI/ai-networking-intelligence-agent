import { handle, json } from '@/lib/api';
import { getOverview } from '@/lib/data';

export const dynamic = 'force-dynamic';

export const GET = handle(async () => json(await getOverview()));
