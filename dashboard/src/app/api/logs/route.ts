import type { NextRequest } from 'next/server';
import { handle, json } from '@/lib/api';
import { getLogs } from '@/lib/data';

export const dynamic = 'force-dynamic';

export const GET = handle(async (req: NextRequest) => json(await getLogs(req.nextUrl.searchParams.get('level'))));
