import type { NextRequest } from 'next/server';
import { clampInt, handle, json } from '@/lib/api';
import { listPosts } from '@/lib/data';

export const dynamic = 'force-dynamic';

const STATUSES = ['Discovered', 'Recommended', 'Reviewed', 'Commented', 'Skipped'];

export const GET = handle(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const status = sp.get('status');
  const result = await listPosts({
    q: sp.get('q'),
    status: status && STATUSES.includes(status) ? status : null,
    minScore: clampInt(sp.get('minScore'), 0, 100, 0),
    sort: sp.get('sort') === 'discovered_at' ? 'discovered_at' : 'relevance_score',
    dir: sp.get('dir') === 'asc' ? 'asc' : 'desc',
    page: clampInt(sp.get('page'), 1, 1000, 1),
    pageSize: clampInt(sp.get('pageSize'), 5, 50, 20),
  });
  return json(result);
});
