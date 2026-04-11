'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { getBounty, getSubmissions, submitWork, type BountyData, type SubmissionData } from '@/lib/api';
import VerificationTerminal from '@/components/VerificationTerminal';
import { truncateAddress } from '@/lib/wallet';
import {
  ArrowLeft, Clock, Users, Code, Send,
  CheckCircle, XCircle, AlertTriangle, FileText, ImageIcon, ShieldCheck, Zap
} from 'lucide-react';
import Link from 'next/link';
import styles from './page.module.css';

function timeLeft(deadline?: string): string {
  if (!deadline) return 'No deadline';
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}

export default function BountyDetailPage() {
  const params = useParams();
  const bountyId = params.id as string;
  const { wallet, role } = useAuthStore();

  const [bounty, setBounty] = useState<BountyData | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionData[]>([]);
  const [loading, setLoading] = useState(true);

  // Submission state
  const [artifact, setArtifact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);
  const [pipelineActive, setPipelineActive] = useState(false);

  // Tab state
  const [tab, setTab] = useState<'details' | 'submit' | 'submissions'>('details');

  useEffect(() => {
    load();
  }, [bountyId]);

  async function load() {
    setLoading(true);
    try {
      const [bountyRes, subRes] = await Promise.all([
        getBounty(bountyId),
        getSubmissions(bountyId).catch(() => ({ data: { submissions: [] } })),
      ]);
      setBounty(bountyRes.data);
      setSubmissions(subRes.data.submissions);
    } catch {
      // Backend error
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!artifact.trim() || !wallet) return;
    setSubmitting(true);
    setSubmitResult(null);
    setPipelineActive(true);

    try {
      const res = await submitWork(bountyId, artifact, wallet);
      if (res.success) {
        setSubmitResult({
          success: true,
          message: `Verification Complete. Settlement executed via Oracle Consensus.`,
        });
      } else {
        setSubmitResult({
          success: false,
          message: res.error || 'Submission failed verification.',
        });
      }
    } catch (e) {
      setSubmitResult({
        success: false,
        message: e instanceof Error ? e.message : 'Network error during submission',
      });
    } finally {
      setSubmitting(false);
      load();
    }
  }

  if (loading) return <div className="page-container"><div className="card">Loading enterprise data...</div></div>;
  if (!bounty) return <div className="page-container"><div className="card">Resource not found.</div></div>;

  return (
    <div className="page-container">
      <Link href="/bounties" className={styles.backLink}>
        <ArrowLeft size={16} /> Marketplace
      </Link>

      {/* Hero Header */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <div className={styles.badges}>
            <span className={`badge badge-${bounty.status}`}>{bounty.status}</span>
            <span className={`badge badge-${bounty.difficulty}`}>{bounty.difficulty}</span>
          </div>
          <h1 className={styles.title}>{bounty.title}</h1>
          <div className={styles.metaRow}>
            <div className={styles.metaItem}><Clock size={16} /> {timeLeft(bounty.deadline)}</div>
            <div className={styles.metaItem}><Users size={16} /> {bounty.submission_count} Active Applicants</div>
            <div className={styles.metaItem}><ShieldCheck size={16} /> Buyer: {truncateAddress(bounty.buyer_wallet, 8)}</div>
          </div>
        </div>
        <div className={styles.rewardBlock}>
          <span className={styles.rewardLabel}>Settlement Amount</span>
          <div className={styles.rewardAmount}>
            {bounty.reward_algo}<span className={styles.rewardUnit}>ALGO</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'details' ? styles.tabActive : ''}`} onClick={() => setTab('details')}>
          <FileText size={18} /> Brief
        </button>
        {role === 'seller' && bounty.status === 'active' && (
          <button className={`${styles.tab} ${tab === 'submit' ? styles.tabActive : ''}`} onClick={() => setTab('submit')}>
            <Send size={18} /> Solve
          </button>
        )}
        <button className={`${styles.tab} ${tab === 'submissions' ? styles.tabActive : ''}`} onClick={() => setTab('submissions')}>
          <Zap size={18} /> Submissions ({submissions.length})
        </button>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {tab === 'details' && (
          <div className="fade-in">
            <div className={styles.section}>
              <h3 className="section-title">Project Context</h3>
              <div className={styles.textBlock}>{bounty.description}</div>
            </div>
            {bounty.requirements && (
              <div className={styles.section}>
                <h3 className="section-title">Technical Requirements</h3>
                <div className={styles.textBlock}>{bounty.requirements}</div>
              </div>
            )}
            <div className={styles.section}>
              <h3 className="section-title">Oracle Verification Strategy</h3>
              <div className="card" style={{ background: 'var(--bg-secondary)', padding: '24px' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  {bounty.asset_type === 'code' 
                    ? 'Automated unit tests (AST + Sandbox) verify logical correctness.' 
                    : 'Multi-modal AI agents verify design alignment and qualitative brand standards.'}
                </p>
                <div className={styles.codeBlock}>{bounty.verification_criteria}</div>
              </div>
            </div>
          </div>
        )}

        {tab === 'submit' && (
          <div className="fade-in">
            <h3 className="section-title">Submit Solution</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)', fontSize: '0.95rem' }}>
              Solutions are verified in real-time. Upon successful verification, funds are automatically released 
              from the Algorand escrow account via 2-of-3 Oracle Consensus.
            </p>
            
            <label className="input-label">
              {bounty.asset_type === 'code' ? 'Source Code (Markdown supported)' : 'Asset URL (Figma, GitHub, or GDrive)'}
            </label>
            <textarea
              className="textarea"
              value={artifact}
              onChange={(e) => setArtifact(e.target.value)}
              placeholder={bounty.asset_type === 'code' ? "def solution(): ..." : "https://figma.com/..."}
              style={{ minHeight: '300px', marginBottom: 'var(--space-xl)' }}
              disabled={submitting}
            />

            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
              onClick={handleSubmit}
              disabled={submitting || !artifact.trim()}
            >
              <ShieldCheck size={18} /> {submitting ? 'Verifying Compliance...' : 'Initiate Settlement Pipeline'}
            </button>

            {submitResult && (
              <div className={`${styles.result} ${submitResult.success ? styles.resultSuccess : styles.resultError}`}>
                {submitResult.success ? <CheckCircle size={20} /> : <XCircle size={20} />}
                {submitResult.message}
              </div>
            )}

            {pipelineActive && (
              <div style={{ marginTop: '40px' }}>
                <h3 className="section-title">On-Chain Verification Streams</h3>
                <VerificationTerminal bountyId={bountyId} active={pipelineActive} />
              </div>
            )}
          </div>
        )}

        {tab === 'submissions' && (
          <div className={styles.subList}>
            {submissions.map((s) => (
              <div key={s.id} className={styles.subRow}>
                <div className={styles.subInfo}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: s.status === 'passed' ? 'var(--accent-primary)' : 'var(--text-tertiary)' }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Solver: {truncateAddress(s.seller_wallet)}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{new Date(s.submitted_at || '').toLocaleString()}</div>
                  </div>
                </div>
                <div className={styles.subChecks}>
                   <Check label="Safety" passed={s.static_passed} />
                   <Check label="Logic" passed={s.sandbox_passed} />
                   <Check label="Final" passed={s.jury_passed} />
                   {s.settlement_time && <span className="badge badge-active">{s.settlement_time.toFixed(1)}s</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Check({ label, passed }: { label: string; passed?: boolean | null }) {
  return (
    <div className={styles.check}>
      {passed ? <CheckCircle size={14} color="var(--accent-primary)" /> : <XCircle size={14} color="var(--text-tertiary)" />}
      <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>{label}</span>
    </div>
  );
}
