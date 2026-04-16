/**
 * VORTEX API Client
 * =================
 * Typed fetch wrapper for all backend endpoints.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Types ──

export interface StandardResponse<T = unknown> {
  success: boolean;
  data: T;
  error: string | null;
  timestamp: string;
}

export interface UserData {
  wallet_address: string;
  role: string;
  tagline?: string;
  bio?: string;
  reputation_score: number;
  total_earned: number;
  total_locked: number;
  total_staked: number;
  github_url?: string;
  skills?: string[];
  portfolio_items?: Array<{ title: string; url: string; type: string }>;
  reviews?: Array<{ id: string; from_wallet: string; rating: number; comment?: string; created_at: string }>;
  created_at?: string;
}

export interface BountyData {
  id: string;
  title: string;
  description: string;
  requirements?: string;
  verification_criteria?: string;
  asset_type: string;
  generated_tests?: boolean;
  reward_algo: number;
  buyer_wallet: string;
  developer_wallet?: string;
  app_id?: number;
  status: string;
  difficulty: string;
  category: string;
  deadline?: string;
  created_at?: string;
  settled_at?: string;
  settlement_time_seconds?: number;
  tx_id?: string;
  submission_count: number;
}

export interface SubmissionData {
  id: string;
  bounty_id?: string;
  seller_wallet: string;
  status: string;
  submitted_at: string;
  static_passed?: boolean;
  sandbox_passed?: boolean;
  jury_passed?: boolean;
  static_logs?: string[];
  sandbox_logs?: string[];
  jury_logs?: string[];
  tx_id?: string;
  settlement_time?: number;
  nft_id?: string;
  nft_asset_url?: string;
}

export interface SubmitWorkResult {
  submission_id?: string;
  status: string;
  tx_ids?: string[];
  settlement_time_seconds?: number;
  tests_passed?: number;
  advisory?: string;
  nft_id?: string;
  tx_id?: string;
  reason?: string;
}

// ── Auth ──

export interface DisputeData {
  id: string;
  bounty_id: string;
  submission_id?: string;
  initiator_wallet: string;
  buyer_claim?: string;
  seller_claim?: string;
  status: string;
  created_at?: string;
  resolved_at?: string;
  resolution?: string;
  release_votes: number;
  refund_votes: number;
  total_staked: number;
  arbiter_count: number;
  votes?: Array<{ voter: string; vote: string; stake: number }>;
}

export interface TransactionData {
  id: string;
  type: string;
  amount_algo: number;
  tx_hash: string;
  status: string;
  created_at?: string;
  bounty_id?: string;
}

export interface HealthData {
  algorand: string;
  docker: string;
  database: string;
  oracle_nodes: string[];
  uptime_seconds: number;
}

export interface VerificationEvent {
  event: string;
  step: number;
  status: string;
  message: string;
  logs: string[];
  data?: Record<string, unknown>;
}

// ── Fetch Wrapper ──

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const activeRole = localStorage.getItem('vortex_active_role');
  if (!activeRole) return localStorage.getItem('vortex_token'); // Fallback for transition
  return localStorage.getItem(`vortex_token_${activeRole}`);
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<StandardResponse<T>> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_URL}${path}`;
  console.log(`[VORTEX-API] Fetching: ${url}`);
  const res = await fetch(url, {
    cache: 'no-store',
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = err.detail;
    const msg = typeof detail === 'string'
      ? detail
      : Array.isArray(detail)
        ? detail.map((d: { msg?: string }) => d.msg || JSON.stringify(d)).join('; ')
        : err.error || `API error ${res.status}`;
    throw new Error(msg);
  }

  return res.json();
}

// ── Auth ──

export async function requestNonce(wallet: string) {
  return apiFetch<{ nonce: string }>('/identity/auth/nonce', {
    method: 'POST',
    body: JSON.stringify({ wallet_address: wallet }),
  });
}

export async function requestAuthParams() {
  return apiFetch<{
    genesis_id: string;
    genesis_hash: string;
    min_fee: number;
    first_round: number;
  }>('/identity/auth/params');
}

export async function verifyAuth(
  wallet: string,
  nonce: string,
  signature: string,
  role: 'buyer' | 'seller'
) {
  return apiFetch<{ token: string; user: UserData }>('/identity/auth/verify', {
    method: 'POST',
    body: JSON.stringify({
      wallet_address: wallet,
      nonce,
      signature,
      role,
    }),
  });
}

export async function getMe() {
  return apiFetch<UserData>('/identity/auth/me');
}

// ── Users ──

export async function getUserProfile(wallet: string) {
  return apiFetch<UserData & { bounties_posted: number; submissions_made: number }>(
    `/identity/users/${wallet}/profile`
  );
}

export async function getUserReputation(wallet: string) {
  return apiFetch<{ pass_rate: number; avg_settlement_seconds: number; total_bounties: number }>(
    `/identity/users/${wallet}/reputation`
  );
}

export async function updateProfile(data: {
  tagline?: string;
  bio?: string;
  skills?: string[];
  github_url?: string;
  portfolio_items?: Array<{ title: string; url: string; type: string }>;
}) {
  return apiFetch<{ updated: boolean }>('/identity/users/me/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function syncGithub() {
  return apiFetch<{ synced_items: number }>('/identity/users/me/sync-github', {
    method: 'POST',
  });
}

export async function createReview(data: {
  bounty_id: string;
  to_wallet: string;
  rating: number;
  comment?: string;
}) {
  return apiFetch<{ review_id: string }>('/identity/reviews', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Bounties ──

export async function listBounties(params?: {
  status?: string;
  difficulty?: string;
  category?: string;
  buyer?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}) {
  const qs = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    });
  }
  const query = qs.toString();
  return apiFetch<{ bounties: BountyData[]; total: number }>(
    `/marketplace/bounties${query ? `?${query}` : ''}`
  );
}

export async function getBounty(id: string) {
  return apiFetch<BountyData>(`/marketplace/bounties/${id}`);
}

export async function createBounty(data: {
  title: string;
  description: string;
  requirements: string;
  verification_criteria: string;
  asset_type: string;
  reward_algo: number;
  deadline: string;
  difficulty?: string;
  category?: string;
  app_id?: number;
}) {
  return apiFetch<{ bounty_id: string; app_id: number }>('/marketplace/bounties', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteBounty(id: string) {
  return apiFetch<{ deleted: boolean }>(`/marketplace/bounties/${id}`, { method: 'DELETE' });
}

export async function generateTests(description: string, category: string) {
  return apiFetch<{ tests: string; test_count: number; covers_edge_cases: boolean; warnings: string[] }>(
    '/marketplace/generate-tests',
    {
      method: 'POST',
      body: JSON.stringify({ prompt: description, category }),
    }
  );
}

export async function evaluateScope(description: string, verification_criteria: string) {
  return apiFetch<{ is_sealed: boolean; score: number; flags: Array<{ type: string; issue: string }> }>('/pipeline/evaluate-scope', {
    method: 'POST',
    body: JSON.stringify({ description, verification_criteria })
  });
}

export async function refineScope(description: string, requirements: string) {
  return apiFetch<{ refined_description: string; refined_requirements: string; logic_constraints: string[] }>('/marketplace/refine-scope', {
    method: 'POST',
    body: JSON.stringify({ description, requirements }),
  });
}

export async function summarizeCriteria(criteria: string) {
  return apiFetch<{ summary: string[] }>('/pipeline/summarize-criteria', {
    method: 'POST',
    body: JSON.stringify({ criteria }),
  });
}

// ── Submissions ──

export async function executeDryRun(artifact: string, verification_criteria: string) {
  return apiFetch<{
    status: string;
    step: string;
    logs: string[];
    time: number;
  }>('/pipeline/dry-run', {
    method: 'POST',
    body: JSON.stringify({ artifact, verification_criteria })
  });
}

export async function submitWork(
  bountyId: string,
  artifact: string,
  developerAddress: string,
  behavioral_metadata?: any
) {
  return apiFetch<SubmitWorkResult>(`/pipeline/submit/${bountyId}`, {
    method: 'POST',
    body: JSON.stringify({ artifact, developer_address: developerAddress, behavioral_metadata }),
  });
}

export async function getSubmissions(bountyId: string) {
  return apiFetch<{ submissions: SubmissionData[] }>(`/pipeline/submissions/${bountyId}`);
}
export async function getSubmission(submissionId: string) {
  return apiFetch<SubmissionData>(`/pipeline/submissions/detail/${submissionId}`);
}

export async function getMySubmissions() {
  return apiFetch<{ submissions: Array<{ 
    id: string; 
    bounty_id: string; 
    bounty_title: string;
    reward_algo: number;
    status: string; 
    submitted_at: string; 
    tx_id: string | null 
  }> }>('/pipeline/mine');
}
// ── Disputes ──

export async function listDisputes() {
  return apiFetch<{ disputes: DisputeData[] }>('/governance/disputes');
}

export async function getDispute(id: string) {
  return apiFetch<DisputeData>(`/governance/disputes/${id}`);
}

export async function createDispute(bountyId: string, submissionId: string, claim: string) {
  return apiFetch<{ dispute_id: string }>('/governance/disputes', {
    method: 'POST',
    body: JSON.stringify({
      bounty_id: bountyId,
      submission_id: submissionId,
      claim,
    }),
  });
}

export async function voteDispute(
  disputeId: string,
  vote: 'release' | 'refund',
  stakeAlgo: number
) {
  return apiFetch<{ recorded: boolean; total_votes: number }>(
    `/governance/disputes/${disputeId}/vote`,
    {
      method: 'POST',
      body: JSON.stringify({ vote, stake_algo: stakeAlgo }),
    }
  );
}

export async function getGovernanceEarnings() {
  return apiFetch<any>('/governance/my-earnings');
}

export async function listComments(bountyId: string) {
  return apiFetch<any[]>(`/bounties/${bountyId}/comments`);
}

export async function postComment(bountyId: string, text: string) {
  return apiFetch<any>(`/bounties/${bountyId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

// ── Transactions ──

export async function getTransactions(wallet: string, params?: { type?: string; limit?: number; offset?: number }) {
  const qs = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) qs.set(k, String(v));
    });
  }
  const query = qs.toString();
  return apiFetch<{ transactions: TransactionData[]; total: number }>(
    `/protocol/transactions/${wallet}${query ? `?${query}` : ''}`
  );
}

// ── Health ──

export interface ProtocolMetrics {
  consensus_velocity_hours: number;
  active_arbiters: number;
  participation_rate: number;
  total_finality_algo: number;
  dispute_volume_algo: number;
  health_score: number;
}

export interface TreasuryStats {
  total_volume_algo: number;
  protocol_fees_accrued: number;
  active_liquid_escrow: number;
  arbitration_rewards_distributed: number;
  net_protocol_reserve: number;
  velocity_30d: number;
}

export interface FiscalReceipt {
  bounty_id: string;
  tx_id: string;
  amount_algo: number;
  buyer: string;
  seller: string;
  settled_at: string;
  oracle_signature: string;
  fiscal_hash: string;
}

export interface MasteryNFT {
  id: string;
  name: string;
  image: string;
  bounty_title: string;
  forensic_hash: string;
  minted_at: string;
  asset_url: string;
}

export async function getHealth() {
  return apiFetch<HealthData>('/protocol/health');
}

export async function getProtocolMetrics() {
  return apiFetch<ProtocolMetrics>('/protocol/metrics');
}

export interface ArbiterPulse {
  total_arbiters: number;
  avg_consensus: number;
  arbiter_pulse: Array<{
    wallet: string;
    participation: number;
    alignment: number;
    total_votes: number;
    status: string;
  }>;
}

export async function getTreasuryStats() {
  return apiFetch<TreasuryStats>('/protocol/treasury');
}

export async function getArbiterPulse() {
  return apiFetch<ArbiterPulse>('/protocol/arbiters');
}

export async function getFiscalReceipt(bountyId: string) {
  return apiFetch<FiscalReceipt>(`/marketplace/${bountyId}/receipt`);
}

export async function getAchievements(wallet: string) {
  return apiFetch<{ achievements: MasteryNFT[] }>(`/identity/users/${wallet}/achievements`);
}

export async function getHistoricalVolume() {
  return apiFetch<{ history: Array<{ date: string; volume: number; finality: number }> }>('/protocol/history');
}

// ── SSE Stream ──

export function createVerificationStream(
  bountyId: string,
  onEvent: (event: VerificationEvent) => void,
  onError?: (error: Event) => void
): EventSource {
  const es = new EventSource(`${API_URL}/pipeline/stream/${bountyId}`);

  const eventTypes = [
    'static_running', 'static_result',
    'sandbox_running', 'sandbox_result',
    'jury_running', 'jury_result',
    'oracle_voting', 'settlement_complete',
    'pipeline_error',
  ];

  eventTypes.forEach((type) => {
    es.addEventListener(type, (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        onEvent(data);
      } catch {
        // ignore parse errors
      }
    });
  });

  es.addEventListener('update', (e: MessageEvent) => {
    try {
      onEvent(JSON.parse(e.data));
    } catch {
      // ignore
    }
  });

  if (onError) {
    es.onerror = onError;
  }

  return es;
}
