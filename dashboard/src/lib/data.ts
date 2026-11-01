import { db } from './supabase';
import { cleanSearch } from './api';
import type {
  AgentState,
  AgentStatus,
  JobRow,
  PersonRow,
  PostRow,
  ReportRow,
  RunStatus,
  SystemLogRow,
} from './types';

const STALE_MINUTES = 30; // matches nis_start_run, which fails runs older than this

type Obj = Record<string, unknown>;

function must<T>(res: { data: T | null; error: { message: string } | null }, label: string): T {
  if (res.error) throw new Error(`${label}: ${res.error.message}`);
  return (res.data ?? ([] as unknown)) as T;
}

function one<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function statements(v: unknown): string[] {
  const s = (v as Obj | null)?.statements;
  return Array.isArray(s) ? s.map(String) : [];
}

/* ------------------------------ Agent status ------------------------------ */

export async function getAgentStatus(): Promise<AgentStatus> {
  const res = await db()
    .from('linkedin_reports')
    .select('id,execution_id,status,stop_requested,started_at,finished_at,summary')
    .order('started_at', { ascending: false })
    .limit(1);
  const rows = must(res, 'agent status') as Obj[];
  const latest = rows[0] as AgentStatus['latest'] | undefined;
  if (!latest) return { state: 'Idle', stale: false, isRunning: false, stopRequested: false, latest: null };

  const isRunning = latest.status === 'running';
  const stopRequested = Boolean((rows[0] as Obj).stop_requested);
  const ageMin = (Date.now() - new Date(latest.started_at).getTime()) / 60000;
  const stale = isRunning && ageMin > STALE_MINUTES;

  let state: AgentState;
  if (isRunning && stopRequested) state = 'Stopping';
  else if (isRunning) state = 'Running';
  else if (latest.status === 'failed') state = 'Failed';
  else state = 'Completed'; // completed | partial | stopped
  return { state, stale, isRunning, stopRequested, latest };
}

/* -------------------------------- Overview -------------------------------- */

async function count(table: string, apply?: (q: any) => any): Promise<number> {
  let q: any = db().from(table).select('id', { count: 'exact', head: true });
  if (apply) q = apply(q);
  const { count: c, error } = await q;
  if (error) throw new Error(`count ${table}: ${error.message}`);
  return c ?? 0;
}

export async function getOverview() {
  const [
    peopleTotal,
    recommended,
    postsTotal,
    clients,
    jobsTotal,
    jobsVerified,
    pending,
    activities,
    agent,
  ] = await Promise.all([
    count('linkedin_people'),
    count('networking_relationships', (q) => q.gt('times_recommended', 0)),
    count('linkedin_posts'),
    count('linkedin_people', (q) => q.eq('category', 'potential_client')),
    count('career_opportunities'),
    count('career_opportunities', (q) => q.or('bangladesh_eligibility.eq.verified_accepts,is_bangladesh_based.eq.true')),
    count('networking_relationships', (q) => q.in('status', ['Recommended', 'Reviewed', 'Follow-up Needed'])),
    count('linkedin_activities'),
    getAgentStatus(),
  ]);

  const peopleRes = await db()
    .from('linkedin_people')
    .select('relevance_score,category,discovered_at')
    .order('discovered_at', { ascending: false })
    .limit(2000);
  const people = must(peopleRes, 'overview people') as Obj[];

  const scoreBuckets = [
    { label: '0-54', min: 0, max: 54, count: 0 },
    { label: '55-69', min: 55, max: 69, count: 0 },
    { label: '70-84', min: 70, max: 84, count: 0 },
    { label: '85-100', min: 85, max: 100, count: 0 },
  ];
  const categories: Record<string, number> = {};
  const perDay: Record<string, number> = {};
  for (const p of people) {
    const s = Number(p.relevance_score);
    if (Number.isFinite(s)) {
      const b = scoreBuckets.find((x) => s >= x.min && s <= x.max);
      if (b) b.count++;
    }
    const c = String(p.category ?? 'unclassified');
    categories[c] = (categories[c] ?? 0) + 1;
    const d = String(p.discovered_at).slice(0, 10);
    perDay[d] = (perDay[d] ?? 0) + 1;
  }

  const [reportsRes, actsRes] = await Promise.all([
    db()
      .from('linkedin_reports')
      .select('execution_id,status,started_at,finished_at,summary')
      .order('started_at', { ascending: false })
      .limit(6),
    db()
      .from('linkedin_activities')
      .select('id,activity_type,occurred_at,linkedin_people(name,company),linkedin_posts(author_name,topic)')
      .order('occurred_at', { ascending: false })
      .limit(8),
  ]);

  return {
    totals: { peopleTotal, recommended, postsTotal, clients, jobsTotal, jobsVerified, pending, activities },
    agent,
    charts: {
      scores: scoreBuckets.map(({ label, count: c }) => ({ label, count: c })),
      categories: Object.entries(categories).map(([name, value]) => ({ name, value })),
      discovery: Object.entries(perDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, value]) => ({ day, value })),
    },
    recentRuns: must(reportsRes, 'overview reports'),
    recentActivity: must(actsRes, 'overview activities'),
  };
}

/* --------------------------------- People --------------------------------- */

export interface PeopleQuery {
  q: string | null;
  category: string | null;
  status: string | null;
  minScore: number;
  sort: 'relevance_score' | 'discovered_at' | 'name';
  dir: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

const PERSON_SELECT =
  'id,name,position,company,category,profile_url,relevance_score,tier,confidence,discovered_at,verified_facts,inferred_facts,unknown_facts,' +
  'networking_relationships(status,times_recommended,last_activity_at),' +
  'linkedin_recommendations(reason,connection_message,evidence_url,recommended_at)';

function mapPerson(r: Obj): PersonRow {
  const rel = one(r.networking_relationships as Obj | Obj[] | null);
  const recs = (Array.isArray(r.linkedin_recommendations) ? (r.linkedin_recommendations as Obj[]) : [])
    .slice()
    .sort((a, b) => String(b.recommended_at).localeCompare(String(a.recommended_at)));
  const rec = recs[0];
  return {
    id: String(r.id),
    name: String(r.name),
    position: (r.position as string) ?? null,
    company: (r.company as string) ?? null,
    category: (r.category as PersonRow['category']) ?? null,
    profile_url: (r.profile_url as string) ?? null,
    relevance_score: (r.relevance_score as number) ?? null,
    tier: (r.tier as string) ?? null,
    confidence: (r.confidence as PersonRow['confidence']) ?? 'low',
    discovered_at: String(r.discovered_at),
    verified: statements(r.verified_facts),
    inferred: statements(r.inferred_facts),
    unknown: Array.isArray(r.unknown_facts) ? (r.unknown_facts as unknown[]).map(String) : [],
    status: (rel?.status as PersonRow['status']) ?? null,
    times_recommended: Number(rel?.times_recommended ?? 0),
    last_activity_at: (rel?.last_activity_at as string) ?? null,
    reason: (rec?.reason as string) ?? null,
    connection_message: (rec?.connection_message as string) ?? null,
    evidence_url: (rec?.evidence_url as string) ?? null,
  };
}

export async function listPeople(p: PeopleQuery) {
  const select = p.status
    ? PERSON_SELECT.replace('networking_relationships(', 'networking_relationships!inner(')
    : PERSON_SELECT;
  let q: any = db().from('linkedin_people').select(select, { count: 'exact' });
  if (p.category) q = q.eq('category', p.category);
  if (p.status) q = q.eq('networking_relationships.status', p.status);
  if (p.minScore > 0) q = q.gte('relevance_score', p.minScore);
  const term = cleanSearch(p.q);
  if (term) q = q.or(`name.ilike.%${term}%,company.ilike.%${term}%,position.ilike.%${term}%`);
  q = q.order(p.sort, { ascending: p.dir === 'asc', nullsFirst: false });
  const from = (p.page - 1) * p.pageSize;
  q = q.range(from, from + p.pageSize - 1);
  const { data, count: total, error } = await q;
  if (error) throw new Error(`people: ${error.message}`);
  return { rows: ((data ?? []) as Obj[]).map(mapPerson), total: total ?? 0 };
}

/* ---------------------------------- Posts --------------------------------- */

export interface PostsQuery {
  q: string | null;
  status: string | null;
  minScore: number;
  sort: 'relevance_score' | 'discovered_at';
  dir: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export async function listPosts(p: PostsQuery) {
  let q: any = db()
    .from('linkedin_posts')
    .select(
      'id,post_url,author_name,company,topic,main_argument,networking_value,relevance_score,suggested_comment,alternative_comment,content_basis,content_accessible,access_limitation,status,discovered_at',
      { count: 'exact' },
    );
  if (p.status) q = q.eq('status', p.status);
  if (p.minScore > 0) q = q.gte('relevance_score', p.minScore);
  const term = cleanSearch(p.q);
  if (term) q = q.or(`author_name.ilike.%${term}%,company.ilike.%${term}%,topic.ilike.%${term}%`);
  q = q.order(p.sort, { ascending: p.dir === 'asc', nullsFirst: false });
  const from = (p.page - 1) * p.pageSize;
  q = q.range(from, from + p.pageSize - 1);
  const { data, count: total, error } = await q;
  if (error) throw new Error(`posts: ${error.message}`);
  return { rows: (data ?? []) as PostRow[], total: total ?? 0 };
}

/* ------------------------------- Opportunities ----------------------------- */

export async function getOpportunities() {
  const [jobsRes, clientsRes] = await Promise.all([
    db()
      .from('career_opportunities')
      .select(
        'id,title,company,job_url,remote_policy,bangladesh_eligibility,eligibility_evidence,location_text,is_bangladesh_based,relevance_score,status,discovered_at',
      )
      .order('relevance_score', { ascending: false, nullsFirst: false })
      .limit(100),
    db()
      .from('linkedin_people')
      .select(PERSON_SELECT)
      .eq('category', 'potential_client')
      .order('relevance_score', { ascending: false, nullsFirst: false })
      .limit(100),
  ]);
  const careerPeopleRes = await db()
    .from('linkedin_people')
    .select(PERSON_SELECT)
    .eq('category', 'career_opportunity')
    .order('relevance_score', { ascending: false, nullsFirst: false })
    .limit(100);
  return {
    jobs: must(jobsRes, 'jobs') as JobRow[],
    clients: (must(clientsRes, 'clients') as unknown as Obj[]).map(mapPerson),
    hiringContacts: (must(careerPeopleRes, 'hiring contacts') as unknown as Obj[]).map(mapPerson),
  };
}

/* ----------------------------------- Logs --------------------------------- */

export async function getLogs(level: string | null) {
  let logsQ: any = db()
    .from('system_execution_logs')
    .select('id,execution_id,workflow_name,node_name,level,message,created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (level && ['debug', 'info', 'warn', 'error'].includes(level)) logsQ = logsQ.eq('level', level);

  const [reportsRes, logsRes, actorsRes] = await Promise.all([
    db()
      .from('linkedin_reports')
      .select('id,execution_id,status,stop_requested,started_at,finished_at,summary')
      .order('started_at', { ascending: false })
      .limit(50),
    logsQ,
    db()
      .from('actor_execution_logs')
      .select('id,actor_id,status,items_returned,cost_usd,error_message,started_at,finished_at')
      .order('started_at', { ascending: false })
      .limit(50),
  ]);

  const reports: ReportRow[] = (must(reportsRes, 'reports') as Obj[]).map((r) => {
    const started = new Date(String(r.started_at)).getTime();
    const finished = r.finished_at ? new Date(String(r.finished_at)).getTime() : null;
    return {
      id: String(r.id),
      execution_id: String(r.execution_id),
      status: r.status as RunStatus,
      stop_requested: Boolean(r.stop_requested),
      started_at: String(r.started_at),
      finished_at: (r.finished_at as string) ?? null,
      duration_seconds: finished ? Math.round((finished - started) / 1000) : null,
      summary: (r.summary as Obj) ?? {},
    };
  });

  return {
    reports,
    logs: must(logsRes as any, 'system logs') as SystemLogRow[],
    actors: must(actorsRes, 'actor logs'),
  };
}

/* --------------------------------- Settings -------------------------------- */

export async function getIntegrationFacts() {
  const t0 = Date.now();
  const [sourcesRes, latestRunsRes, actorCount, lastTelegramRun] = await Promise.all([
    db()
      .from('source_registry')
      .select('name,source_type,compliance_status,enabled,est_cost_usd_per_unit,cost_unit,compliance_notes')
      .order('name'),
    db()
      .from('linkedin_reports')
      .select('summary,started_at,status')
      .order('started_at', { ascending: false })
      .limit(10),
    count('actor_execution_logs'),
    db()
      .from('linkedin_reports')
      .select('started_at,trigger_chat_id')
      .not('trigger_chat_id', 'is', null)
      .order('started_at', { ascending: false })
      .limit(1),
  ]);
  const latencyMs = Date.now() - t0;

  const providers = new Set<string>();
  let apifyUsed = false;
  for (const r of must(latestRunsRes, 'runs') as Obj[]) {
    const s = (r.summary as Obj) ?? {};
    if (Array.isArray(s.providers)) (s.providers as unknown[]).forEach((x) => providers.add(String(x)));
    if (s.apify_used === true) apifyUsed = true;
  }
  const tg = (must(lastTelegramRun, 'telegram run') as Obj[])[0];

  return {
    supabase: { latencyMs },
    sources: must(sourcesRes, 'sources'),
    providers: Array.from(providers),
    apify: { actorRuns: actorCount, usedInRecentRuns: apifyUsed },
    telegram: { lastRunTriggerAt: (tg?.started_at as string) ?? null },
  };
}
