// Shapes mirror the live Supabase schema (migrations 001-005). Nothing here is invented.

export type Category =
  | 'career_opportunity'
  | 'industry_leader'
  | 'potential_client'
  | 'professional_peer'
  | 'unclassified';

export type RelationshipStatus =
  | 'Discovered'
  | 'Recommended'
  | 'Reviewed'
  | 'Connection Request Sent'
  | 'Connected'
  | 'Ignored'
  | 'Follow-up Needed';

export type PostStatus = 'Discovered' | 'Recommended' | 'Reviewed' | 'Commented' | 'Skipped';

export type PersonAction = 'reviewed' | 'sent' | 'connected' | 'ignore' | 'followup';
export type PostAction = 'reviewed' | 'commented' | 'skip';

export type RunStatus = 'running' | 'completed' | 'failed' | 'stopped' | 'partial';
export type AgentState = 'Idle' | 'Running' | 'Completed' | 'Failed' | 'Stopping';

export interface PersonRow {
  id: string;
  name: string;
  position: string | null;
  company: string | null;
  category: Category | null;
  profile_url: string | null;
  relevance_score: number | null;
  tier: string | null;
  confidence: 'high' | 'medium' | 'low';
  discovered_at: string;
  verified: string[];
  inferred: string[];
  unknown: string[];
  status: RelationshipStatus | null;
  times_recommended: number;
  last_activity_at: string | null;
  reason: string | null;
  connection_message: string | null;
  evidence_url: string | null;
}

export interface PostRow {
  id: string;
  post_url: string | null;
  author_name: string | null;
  company: string | null;
  topic: string | null;
  main_argument: string | null;
  networking_value: string | null;
  relevance_score: number | null;
  suggested_comment: string | null;
  alternative_comment: string | null;
  content_basis: 'full' | 'snippet' | 'none';
  content_accessible: boolean;
  access_limitation: string | null;
  status: PostStatus;
  discovered_at: string;
}

export interface JobRow {
  id: string;
  title: string;
  company: string | null;
  job_url: string | null;
  remote_policy: 'remote' | 'hybrid' | 'onsite' | 'unknown' | null;
  bangladesh_eligibility: 'verified_accepts' | 'verified_excludes' | 'unknown';
  eligibility_evidence: string | null;
  location_text: string | null;
  is_bangladesh_based: boolean;
  relevance_score: number | null;
  status: string;
  discovered_at: string;
}

export interface AgentStatus {
  state: AgentState;
  stale: boolean;
  isRunning: boolean;
  stopRequested: boolean;
  latest: {
    id: string;
    execution_id: string;
    status: RunStatus;
    started_at: string;
    finished_at: string | null;
    summary: Record<string, unknown>;
  } | null;
}

export interface ReportRow {
  id: string;
  execution_id: string;
  status: RunStatus;
  stop_requested: boolean;
  started_at: string;
  finished_at: string | null;
  duration_seconds: number | null;
  summary: Record<string, unknown>;
}

export interface SystemLogRow {
  id: number;
  execution_id: string | null;
  workflow_name: string | null;
  node_name: string | null;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  created_at: string;
}
