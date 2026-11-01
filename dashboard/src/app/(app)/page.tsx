'use client';

import useSWR from 'swr';
import { fetcher } from '@/lib/client';
import { AgentControl } from '@/components/AgentControl';
import { CategoryChart, ChartCard, DiscoveryChart, ScoreChart } from '@/components/Charts';
import { Badge, EmptyState, ErrorState, PageHeader, StatCard } from '@/components/ui';
import { dateTime, duration, num, str, timeAgo } from '@/lib/format';

interface Overview {
  totals: {
    peopleTotal: number; recommended: number; postsTotal: number; clients: number;
    jobsTotal: number; jobsVerified: number; pending: number; activities: number;
  };
  charts: {
    scores: { label: string; count: number }[];
    categories: { name: string; value: number }[];
    discovery: { day: string; value: number }[];
  };
  recentRuns: { execution_id: string; status: string; started_at: string; finished_at: string | null; summary: Record<string, unknown> }[];
  recentActivity: {
    id: string; activity_type: string; occurred_at: string;
    linkedin_people: { name: string; company: string | null } | null;
    linkedin_posts: { author_name: string | null; topic: string | null } | null;
  }[];
}

const ACTIVITY_LABEL: Record<string, string> = {
  connection_request_sent: 'Connection request sent',
  connected: 'Connected',
  commented: 'Commented',
  reviewed: 'Reviewed',
  skipped: 'Skipped',
  ignored: 'Ignored',
  follow_up_needed: 'Follow-up needed',
};

export default function OverviewPage() {
  const { data, error, isLoading, mutate } = useSWR<Overview>('/api/overview', fetcher, { refreshInterval: 20000 });

  if (error) return (<><PageHeader title="Overview" /><ErrorState onRetry={() => mutate()} /></>);
  const t = data?.totals;

  return (
    <>
      <PageHeader title="Overview" subtitle="Live data from your Supabase memory. Refreshes automatically." />
      <div className="space-y-4">
        <AgentControl compact />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard loading={isLoading} label="Discovered" value={t?.peopleTotal} hint="professionals" />
          <StatCard loading={isLoading} label="Recommended" value={t?.recommended} hint={`${t?.pending ?? 0} awaiting your action`} />
          <StatCard loading={isLoading} label="Posts analyzed" value={t?.postsTotal} />
          <StatCard loading={isLoading} label="Potential clients" value={t?.clients} />
          <StatCard loading={isLoading} label="Career pages" value={t?.jobsTotal} hint={`${t?.jobsVerified ?? 0} Bangladesh-eligible`} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartCard title="Discovery over time" hint="Profiles by first-seen date">
              {data && data.charts.discovery.length ? <DiscoveryChart data={data.charts.discovery} /> : <ChartEmpty />}
            </ChartCard>
          </div>
          <ChartCard title="Relevance scores" hint="70+ is recommended">
            {data && data.totals.peopleTotal ? <ScoreChart data={data.charts.scores} /> : <ChartEmpty />}
          </ChartCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard title="By category">
            {data && data.charts.categories.length ? <CategoryChart data={data.charts.categories} /> : <ChartEmpty />}
          </ChartCard>

          <div className="card p-4 lg:col-span-1">
            <div className="mb-3 text-sm font-medium text-slate-100">Recent runs</div>
            {data?.recentRuns.length ? (
              <ul className="space-y-2.5">
                {data.recentRuns.map((r) => (
                  <li key={r.execution_id} className="flex items-center justify-between gap-2 text-[13px]">
                    <div className="min-w-0">
                      <div className="truncate text-slate-200">Run {r.execution_id}</div>
                      <div className="text-xs text-slate-500">
                        {timeAgo(r.started_at)} · {num(r.summary.recommended_people)} people · {num(r.summary.recommended_posts)} posts
                      </div>
                    </div>
                    <Badge tone={r.status === 'completed' ? 'green' : r.status === 'running' ? 'blue' : r.status === 'failed' ? 'red' : 'amber'}>{r.status}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">No runs yet.</p>
            )}
          </div>

          <div className="card p-4">
            <div className="mb-3 text-sm font-medium text-slate-100">Recent activity you confirmed</div>
            {data?.recentActivity.length ? (
              <ul className="space-y-2.5">
                {data.recentActivity.map((a) => (
                  <li key={a.id} className="text-[13px]">
                    <div className="text-slate-200">
                      {ACTIVITY_LABEL[a.activity_type] ?? a.activity_type}
                      <span className="text-slate-500"> · </span>
                      {a.linkedin_people?.name ?? a.linkedin_posts?.author_name ?? 'Unknown'}
                    </div>
                    <div className="text-xs text-slate-500">{dateTime(a.occurred_at)}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">Nothing confirmed yet. Activity is recorded only when you mark it.</p>
            )}
          </div>
        </div>

        {data?.recentRuns[0] && (
          <p className="text-xs text-slate-500">
            Latest run searched {num(data.recentRuns[0].summary.searches)} queries, analysed {num(data.recentRuns[0].summary.analysed)} results
            {data.recentRuns[0].finished_at && ` in ${duration(Math.round((new Date(data.recentRuns[0].finished_at).getTime() - new Date(data.recentRuns[0].started_at).getTime()) / 1000))}`}
            {str(data.recentRuns[0].summary.providers) && ` using ${str(data.recentRuns[0].summary.providers).replace(/,/g, ' + ')}`}.
          </p>
        )}
      </div>
    </>
  );
}

function ChartEmpty() {
  return <EmptyState title="No data yet" hint="Charts fill in after the first research run." />;
}
