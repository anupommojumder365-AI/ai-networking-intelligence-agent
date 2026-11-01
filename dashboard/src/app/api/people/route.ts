import type { NextRequest } from 'next/server';
import { clampInt, handle, json } from '@/lib/api';
import { listPeople } from '@/lib/data';

export const dynamic = 'force-dynamic';

const CATEGORIES = ['career_opportunity', 'industry_leader', 'potential_client', 'professional_peer', 'unclassified'];
const STATUSES = ['Discovered', 'Recommended', 'Reviewed', 'Connection Request Sent', 'Connected', 'Ignored', 'Follow-up Needed'];
const SORTS = ['relevance_score', 'discovered_at', 'name'] as const;

export const GET = handle(async (req: NextRequest) => {
  const sp = req.nextUrl.searchParams;
  const category = sp.get('category');
  const status = sp.get('status');
  const sort = sp.get('sort') as (typeof SORTS)[number] | null;
  const result = await listPeople({
    q: sp.get('q'),
    category: category && CATEGORIES.includes(category) ? category : null,
    status: status && STATUSES.includes(status) ? status : null,
    minScore: clampInt(sp.get('minScore'), 0, 100, 0),
    sort: sort && SORTS.includes(sort) ? sort : 'relevance_score',
    dir: sp.get('dir') === 'asc' ? 'asc' : 'desc',
    page: clampInt(sp.get('page'), 1, 1000, 1),
    pageSize: clampInt(sp.get('pageSize'), 5, 50, 20),
  });
  return json(result);
});
