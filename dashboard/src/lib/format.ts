export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '-';
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function duration(seconds: number | null | undefined): string {
  if (seconds == null) return '-';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

export const CATEGORY_LABEL: Record<string, string> = {
  career_opportunity: 'Career',
  industry_leader: 'Industry leader',
  potential_client: 'Potential client',
  professional_peer: 'Peer',
  unclassified: 'Unclassified',
};

export function tierLabel(score: number | null | undefined): string {
  if (score == null) return 'Unscored';
  if (score >= 85) return 'Highly valuable';
  if (score >= 70) return 'Strong match';
  if (score >= 55) return 'Moderate';
  return 'Not recommended';
}

export function str(v: unknown): string {
  return v == null ? '' : String(v);
}

export function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
