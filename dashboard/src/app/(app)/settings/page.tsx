'use client';

import useSWR from 'swr';
import { CheckCircle2, CircleDashed, XCircle } from 'lucide-react';
import { fetcher } from '@/lib/client';
import { Badge, ErrorState, PageHeader, SkeletonRows } from '@/components/ui';
import { timeAgo } from '@/lib/format';

interface Source { name: string; source_type: string; compliance_status: string; enabled: boolean; est_cost_usd_per_unit: number | null; cost_unit: string | null; compliance_notes: string | null }
interface Settings {
  supabase: { latencyMs: number };
  sources: Source[];
  providers: string[];
  apify: { actorRuns: number; usedInRecentRuns: boolean };
  telegram: { lastRunTriggerAt: string | null };
  gateway: { reachable: boolean; registered: boolean; httpStatus: number | null };
  env: Record<string, boolean>;
}

type Tone = 'ok' | 'warn' | 'off';

function Row({ name, tone, status, detail }: { name: string; tone: Tone; status: string; detail: string }) {
  const Icon = tone === 'ok' ? CheckCircle2 : tone === 'warn' ? CircleDashed : XCircle;
  const color = tone === 'ok' ? 'text-emerald-400' : tone === 'warn' ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-medium text-white">{name}</div>
          <Badge tone={tone === 'ok' ? 'green' : tone === 'warn' ? 'amber' : 'red'}>{status}</Badge>
        </div>
        <p className="mt-0.5 text-xs text-slate-400">{detail}</p>
      </div>
    </div>
  );
}

const COMPLIANCE_TONE: Record<string, 'green' | 'amber' | 'red' | 'slate'> = { approved: 'green', conditional: 'amber', rejected: 'red', unverified: 'slate' };

export default function SettingsPage() {
  const { data, error, isLoading, mutate } = useSWR<Settings>('/api/settings', fetcher, { refreshInterval: 60000 });

  if (error) return (<><PageHeader title="Settings" /><ErrorState onRetry={() => mutate()} /></>);
  if (isLoading || !data) return (<><PageHeader title="Settings" /><SkeletonRows rows={6} /></>);

  const gw = data.gateway;
  const missing = Object.entries(data.env).filter(([, v]) => !v).map(([k]) => k);
  const claude = data.providers.includes('claude');
  const openai = data.providers.includes('openai');

  return (
    <>
      <PageHeader title="Settings" subtitle="Integration status, checked live. Secrets are never shown." />

      <div className="card divide-y divide-line">
        <Row name="Supabase" tone="ok" status="Connected" detail={`Database reachable (${data.supabase.latencyMs} ms for this check).`} />
        <Row
          name="n8n gateway"
          tone={gw.reachable && gw.registered ? 'ok' : gw.reachable ? 'warn' : 'off'}
          status={gw.reachable && gw.registered ? 'Reachable' : gw.reachable ? 'Reachable, webhook not found' : 'Unreachable'}
          detail={
            gw.reachable && gw.registered
              ? 'NIS 05 - Dashboard Gateway is published and answering. The probe sends a GET and never starts a run.'
              : gw.reachable
                ? `n8n answered (HTTP ${gw.httpStatus}) but the NIS 05 webhook was not recognized. Check that the workflow is published and N8N_GATEWAY_URL is correct.`
                : 'Could not reach N8N_GATEWAY_URL, or it is not set.'
          }
        />
        <Row
          name="Telegram"
          tone={data.telegram.lastRunTriggerAt ? 'ok' : 'warn'}
          status={data.telegram.lastRunTriggerAt ? 'Seen in a run' : 'Not confirmed'}
          detail={
            data.telegram.lastRunTriggerAt
              ? `The bot lives in n8n. Last run it recorded started ${timeAgo(data.telegram.lastRunTriggerAt)}. Runs from this dashboard also notify Telegram.`
              : 'The bot lives in n8n. No run with a Telegram chat has been recorded yet, so end-to-end delivery is unconfirmed.'
          }
        />
        <Row
          name="Apify"
          tone={data.apify.actorRuns > 0 ? 'ok' : 'warn'}
          status={data.apify.actorRuns > 0 ? 'In use' : 'No Actor runs'}
          detail={
            data.apify.actorRuns > 0
              ? `${data.apify.actorRuns} Actor runs logged.`
              : 'No Actor run has been recorded. Discovery currently uses Brave Search. Apify needs an API token added in n8n, and each Actor must pass the compliance review first.'
          }
        />
        <Row
          name="Claude"
          tone={claude ? 'ok' : 'warn'}
          status={claude ? 'Used in recent runs' : 'Not seen'}
          detail={claude ? 'Primary analysis provider in the last 10 runs.' : 'No recent run used Claude.'}
        />
        <Row
          name="OpenAI"
          tone={openai ? 'ok' : 'warn'}
          status={openai ? 'Used in recent runs' : 'Fallback, not yet used'}
          detail={openai ? 'Used as a fallback in recent runs.' : 'Configured as the fallback when Claude output fails. No recent run needed it, so it is untested live.'}
        />
      </div>

      <div className="mt-6">
        <div className="mb-2 text-sm font-medium text-slate-100">Data sources and compliance</div>
        <div className="card divide-y divide-line">
          {data.sources.map((s) => (
            <div key={s.name} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-slate-200">{s.name}</div>
                <div className="text-xs text-slate-500">
                  {s.source_type}
                  {s.est_cost_usd_per_unit != null && ` · ~$${s.est_cost_usd_per_unit}/${s.cost_unit ?? 'unit'}`}
                </div>
                {s.compliance_notes && <p className="mt-1 text-xs text-slate-400">{s.compliance_notes}</p>}
              </div>
              <div className="flex gap-2">
                <Badge tone={COMPLIANCE_TONE[s.compliance_status] ?? 'slate'}>{s.compliance_status}</Badge>
                <Badge tone={s.enabled ? 'green' : 'slate'}>{s.enabled ? 'enabled' : 'disabled'}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 text-sm font-medium text-slate-100">Deployment configuration</div>
        <div className="card p-4">
          {missing.length === 0 ? (
            <p className="text-[13px] text-emerald-300">All required environment variables are set.</p>
          ) : (
            <p className="text-[13px] text-amber-300">Not set: {missing.join(', ')}</p>
          )}
          <p className="mt-2 text-xs text-slate-500">Values are read on the server only. This list shows presence, never content.</p>
        </div>
      </div>
    </>
  );
}
