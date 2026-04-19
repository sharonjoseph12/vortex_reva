'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { getBounty, getSubmissions, submitWork, createReview, getFiscalReceipt, createDispute, type BountyData, type SubmissionData } from '@/lib/api';
import VerificationTerminal from '@/components/VerificationTerminal';
import CopyAddress from '@/components/CopyAddress';
import {
  ArrowLeft, Clock, Users, Code, Send,
  CheckCircle, XCircle, AlertTriangle, FileText, Eye, Star, Download, ShieldCheck, Award
} from 'lucide-react';
import ForensicHighlight from '@/components/ForensicHighlight';
import ForensicTimeline from '@/components/ForensicTimeline';
import ExplorerLink from '@/components/ExplorerLink';
import BountyComments from '@/components/BountyComments';
import LogicHumanizer from '@/components/LogicHumanizer';
import ComplianceReceipt from '@/components/ComplianceReceipt';
import Link from 'next/link';
import ProfileGate from '@/components/ProfileGate';
import EvidenceModal from '@/components/EvidenceModal';
import { getSubmission } from '@/lib/api';
import styles from './page.module.css';

function timeLeft(deadline?: string): string {
  if (!deadline) return 'No deadline';
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h remaining`;
  return `${hours}h remaining`;
}

export default function BountyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bountyId = params.id as string;
  const { wallet, role } = useAuthStore();

  const [bounty, setBounty] = useState<BountyData | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionData[]>([]);
  const [loading, setLoading] = useState(true);

  // Submission state
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string; settlementData?: { tests_passed?: number; settlement_time?: number; nft_id?: string; reward_algo?: number; tx_id?: string } } | null>(null);
  const [pipelineActive, setPipelineActive] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  // Tab state
  const [tab, setTab] = useState<'details' | 'submit' | 'submissions'>('details');
  const [receipt, setReceipt] = useState<any>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Review state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [startTime] = useState(Date.now());
  const [focusLossCount, setFocusLossCount] = useState(0);

  // Evidence Modal state
  const [selectedSub, setSelectedSub] = useState<any | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);

  useEffect(() => {
    const handleBlur = () => setFocusLossCount(prev => prev + 1);
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, []);

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
      // error
    } finally {
      setLoading(false);
    }
  }

  const handleDispute = async (submissionId: string) => {
    const claim = prompt("Enter your reason for challenging this AI verdict:");
    if (!claim) return;

    try {
      setLoading(true);
      await createDispute(bountyId, submissionId, claim);
      router.push('/governance');
    } catch (e: any) {
      alert(e.message || "Failed to initiate dispute");
    } finally {
      setLoading(false);
    }
  };

  async function handleReviewSubmit() {
    if (!wallet || !bounty) return;
    setReviewing(true);
    try {
      const to_wallet = wallet === bounty.buyer_wallet ? bounty.developer_wallet : bounty.buyer_wallet;
      if (!to_wallet) return;

      await createReview({
        bounty_id: bountyId,
        to_wallet,
        rating,
        comment
      });
      setReviewSubmitted(true);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to submit review');
    } finally {
      setReviewing(false);
    }
  }

  async function handleSubmit() {
    if (!code.trim() || !wallet) return;
    setSubmitting(true);
    setSubmitResult(null);
    setPipelineActive(true);

    try {
      const behavioralMetadata = {
        duration_seconds: Math.floor((Date.now() - startTime) / 1000),
        focus_loss_count: focusLossCount,
        platform: typeof window !== 'undefined' ? window.navigator.platform : 'unknown',
        screen_resolution: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'unknown'
      };

      const res = await submitWork(bountyId, code, wallet, behavioralMetadata);
      if (res.data?.submission_id) {
        setSubmissionId(res.data.submission_id);
      }
      // Pipeline is now running async — VerificationTerminal will poll for updates
    } catch (e) {
      setSubmitResult({
        success: false,
        message: e instanceof Error ? e.message : 'Submission failed',
      });
      setPipelineActive(false);
    } finally {
      setSubmitting(false);
    }
  }

  function handlePipelineSettled(data: Record<string, unknown>) {
    setPipelineActive(false);
    setSubmitResult({
      success: true,
      message: `Settlement complete!`,
      settlementData: {
        tests_passed: (data.tests_passed as number) ?? 0,
        settlement_time: (data.settlement_time as number) ?? 0,
        nft_id: (data.nft_id as string) ?? undefined,
        reward_algo: bounty?.reward_algo ?? 0,
        tx_id: (data.tx_id as string) ?? undefined,
      }
    });
    // Silent reload — don't set loading=true to avoid unmounting the UI
    Promise.all([
      getBounty(bountyId),
      getSubmissions(bountyId).catch(() => ({ data: { submissions: [] } })),
    ]).then(([bountyRes, subRes]) => {
      setBounty(bountyRes.data);
      setSubmissions(subRes.data.submissions);
    });
  }

  async function openEvidence(submissionId: string) {
    setEvidenceLoading(true);
    try {
      const res = await getSubmission(submissionId);
      setSelectedSub(res.data);
    } catch (e) {
      alert('Failed to load forensic evidence');
    } finally {
      setEvidenceLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="loading-pulse" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
            Loading bounty...
          </div>
        </div>
      </div>
    );
  }

  if (!bounty) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="empty-state-text">Bounty not found</div>
        </div>
      </div>
    );
  }

  return (
    <ProfileGate>
      <div className="page-container">
      {/* Back */}
      <Link href="/bounties" className={styles.backLink}>
        <ArrowLeft size={14} /> Back to Marketplace
      </Link>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <div className={styles.badges}>
            <span className={`badge badge-${bounty.status}`}>{bounty.status}</span>
            <span className={`badge badge-${bounty.difficulty}`}>{bounty.difficulty}</span>
            <span className="badge badge-settled">{bounty.category}</span>
          </div>
          <h1 className={styles.title}>{bounty.title}</h1>
          <div className={styles.metaRow}>
            <span className={styles.metaItem}>
              <Clock size={12} /> {timeLeft(bounty.deadline)}
            </span>
            <span className={styles.metaItem}>
              <Users size={12} /> {bounty.submission_count} submissions
            </span>
            <span className={styles.metaItem}>
              Posted by <CopyAddress address={bounty.buyer_wallet} />
            </span>
          </div>
        </div>
        <div className={styles.rewardBlock}>
          <span className={styles.rewardLabel}>Reward</span>
          <span className={styles.rewardAmount}>{bounty.reward_algo}</span>
          <span className={styles.rewardUnit}>ALGO</span>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'details' ? styles.tabActive : ''}`}
          onClick={() => setTab('details')}
        >
          <FileText size={14} /> Details
        </button>
        {role === 'seller' && bounty.status === 'active' && (
          <button
            className={`${styles.tab} ${tab === 'submit' ? styles.tabActive : ''}`}
            onClick={() => setTab('submit')}
          >
            <Send size={14} /> Submit Solution
          </button>
        )}
        <button
          className={`${styles.tab} ${tab === 'submissions' ? styles.tabActive : ''}`}
          onClick={() => setTab('submissions')}
        >
          <Code size={14} /> Submissions ({submissions.length})
        </button>
      </div>

      {/* Tab Content */}
      {tab === 'details' && (
        <div className={styles.content}>
          <div className={styles.section}>
            <h3 className="section-title">Description</h3>
            <div className={styles.textBlock}>{bounty.description}</div>
          </div>
          {bounty.requirements && (
            <div className={styles.section}>
              <h3 className="section-title">Requirements</h3>
              <div className={styles.textBlock}>{bounty.requirements}</div>
            </div>
          )}
          {bounty.verification_criteria && (
            <div className={styles.section}>
              <h3 className="section-title">
                {bounty.asset_type === 'code' ? 'Unit Tests' : 'Verification Criteria'}
              </h3>
              <pre className={styles.codeBlock}>{bounty.verification_criteria}</pre>
            </div>
          )}

          {/* Institutional Compliance Gateway */}
          {bounty.status === 'settled' && (
            <div className={styles.section} style={{ border: '1px solid var(--accent-primary-dim)', background: 'var(--bg-secondary)', padding: '24px', borderRadius: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 className="section-title" style={{ color: 'var(--accent-primary)', marginBottom: '8px' }}>
                    <ShieldCheck size={18} /> Institutional Compliance
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '400px' }}>
                    This settlement has been cryptographically signed by the VORTEX Oracle stack. 
                    Download your certified fiscal receipt for institutional auditing.
                  </p>
                </div>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={async () => {
                    if (!receipt) {
                      const res = await getFiscalReceipt(bountyId);
                      setReceipt(res.data);
                    }
                    setShowReceipt(!showReceipt);
                  }}
                >
                  <Download size={14} /> {showReceipt ? 'Hide Receipt' : 'View Certified Receipt'}
                </button>
              </div>

              {showReceipt && receipt && (
                <div style={{ marginTop: '24px', animation: 'fadeIn 0.3s ease' }}>
                  <ComplianceReceipt receipt={receipt} />
                </div>
              )}
            </div>
          )}

          {/* Review Section (Post-Settlement) */}
          {bounty.status === 'settled' && !reviewSubmitted && (wallet === bounty.buyer_wallet || wallet === bounty.developer_wallet) && (
             <div className={styles.section} style={{ border: '1px solid var(--accent-primary)', padding: '24px', borderRadius: '12px', background: 'var(--bg-secondary)' }}>
                <h3 className="section-title" style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Star size={18} fill="currentColor" /> Submit Verified Feedback
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  Rate the {wallet === bounty.buyer_wallet ? 'Partner' : 'Buyer'} to help build the VORTEX trust network.
                </p>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button 
                      key={s} 
                      onClick={() => setRating(s)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      <Star size={24} fill={s <= rating ? "var(--warning)" : "none"} color={s <= rating ? "var(--warning)" : "var(--text-tertiary)"} />
                    </button>
                  ))}
                </div>

                <textarea 
                  className="textarea" 
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience..."
                  style={{ minHeight: '100px', marginBottom: '16px' }}
                />

                <button 
                  className="btn btn-primary" 
                  onClick={handleReviewSubmit}
                  disabled={reviewing}
                  style={{ width: '100%' }}
                >
                  {reviewing ? 'Recording Review...' : 'Submit Feedback'}
                </button>
             </div>
          )}
          {reviewSubmitted && (
            <>
              <div className={styles.section}>
                <h3 className="section-title">Operational Constraints</h3>
                <LogicHumanizer criteria={bounty.verification_criteria || ''} />
              </div>

              <div className={styles.section} style={{ textAlign: 'center', padding: '24px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                <CheckCircle size={32} color="var(--accent-primary)" style={{ marginBottom: '8px' }} />
                <p style={{ fontWeight: 700 }}>Feedback recorded. Reputation score updated.</p>
              </div>
            </>
          )}

          <div className={styles.section}>
            <h3 className="section-title">Requirements Clarification</h3>
            <BountyComments />
          </div>
        </div>
      )}

      {tab === 'submit' && (
        <div className={styles.content}>
          <div className={styles.section}>
            <h3 className="section-title">Submit Your Solution</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
              {bounty.asset_type === 'code' 
                ? 'Your code will pass through the 3-layer verification pipeline: Static Analysis → Docker Sandbox → AI Advisory Jury → Oracle Settlement'
                : 'Your submission will be evaluated by the Multi-Modal AI Jury based on the Verification Criteria, followed by Oracle Settlement.'
              }
            </p>

            <label className="input-label">
              {bounty.asset_type === 'code' ? 'Solution Code (Python)' : 'Asset URL or Data (e.g., Figma link)'}
            </label>
            <textarea
              className="textarea"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={bounty.asset_type === 'code' ? "# Paste your solution here..." : "https://figma.com/file/..."}
              style={{ minHeight: '240px', marginBottom: 'var(--space-md)' }}
              disabled={submitting}
            />

            <div style={{ display: 'flex', gap: '16px', marginTop: 'var(--space-md)' }}>
              <button
                className="btn btn-secondary"
                onClick={async () => {
                   setSubmitting(true);
                   try {
                     const { executeDryRun } = await import('@/lib/api');
                     const res = await executeDryRun(code, bounty.verification_criteria || '');
                     setSubmitResult({ success: res.success, message: `Dry Run ${res.data.status.toUpperCase()}: ${res.data.logs.join(' | ')}` });
                   } catch (e) {
                     setSubmitResult({ success: false, message: e instanceof Error ? e.message : 'Dry run failed' });
                   } finally {
                     setSubmitting(false);
                   }
                }}
                disabled={submitting || !code.trim() || bounty.asset_type !== 'code'}
                style={{ flex: 1 }}
                title="Execute Docker logic locally without deploying to on-chain Oracle"
              >
                <Code size={16} />
                Terminal Dry-Run
              </button>
              
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting || !code.trim()}
                id="submit-code-btn"
                style={{ flex: 2 }}
              >
                <Send size={16} />
                {submitting ? 'Verifying...' : 'Submit to Pipeline'}
              </button>
            </div>

            {submitResult && !submitResult.success && (
              <div className={`${styles.result} ${styles.resultError}`}>
                <XCircle size={16} />
                {submitResult.message}
              </div>
            )}

            {submitResult?.success && submitResult.settlementData && (
              <div style={{
                marginTop: 'var(--space-lg)',
                border: '1px solid var(--accent-primary)',
                background: 'linear-gradient(135deg, rgba(0,208,255,0.05) 0%, rgba(0,0,0,0) 60%)',
                padding: '28px',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Glow accent */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                  background: 'linear-gradient(90deg, var(--accent-primary), transparent)',
                }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                  <div style={{
                    width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,208,255,0.12)', borderRadius: '50%',
                  }}>
                    <CheckCircle size={28} color="var(--accent-primary)" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                      SETTLEMENT CONFIRMED
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                      Oracle consensus achieved · Funds released
                    </p>
                  </div>
                </div>

                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '16px', marginBottom: '24px'
                }}>
                  <div style={{ padding: '16px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.08em' }}>REWARD</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                      {submitResult.settlementData.reward_algo} <span style={{ fontSize: '0.7rem', fontWeight: 600, opacity: 0.7 }}>ALGO</span>
                    </div>
                  </div>
                  <div style={{ padding: '16px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.08em' }}>TX PROOF</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                      <ExplorerLink type="transaction" id={submitResult.settlementData.tx_id || ''} />
                    </div>
                  </div>
                  {submitResult.settlementData.nft_id && (
                    <div style={{ padding: '16px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.08em' }}>MASTERY NFT</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>
                        <ExplorerLink type="asset" id={submitResult.settlementData.nft_id || ''} />
                      </div>
                    </div>
                  )}
                </div>

                <ForensicTimeline 
                   stages={[
                     { id: '1', name: 'Static AST', description: 'Deterministic syntax & security audit', status: bounty?.asset_type === 'code' ? 'passed' : 'pending' },
                     { id: '2', name: 'Sandbox', description: bounty?.asset_type === 'code' ? `${submitResult.settlementData.tests_passed} tests passed` : 'N/A — AI Jury evaluated', status: bounty?.asset_type === 'code' && (submitResult.settlementData.tests_passed ?? 0) > 0 ? 'passed' : bounty?.asset_type !== 'code' ? 'pending' : 'running' },
                     { id: '3', name: 'AI Jury', description: 'Multi-modal semantic verification', status: 'passed' },
                     { id: '4', name: 'Oracle', description: '2-of-3 Consensus Settlement', status: 'passed', txId: submitResult.settlementData.tx_id || '' }
                   ]}
                />
              </div>
            )}
          </div>

          {/* Verification Terminal */}
          {pipelineActive && submissionId && (
            <div className={styles.section}>
              <h3 className="section-title">Verification Pipeline</h3>
              <VerificationTerminal bountyId={bountyId} submissionId={submissionId} active={pipelineActive} onSettled={handlePipelineSettled} />
            </div>
          )}
        </div>
      )}

      {tab === 'submissions' && (
        <div className={styles.content}>
          {submissions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-text">No submissions yet</div>
            </div>
          ) : (
            <div className={styles.subList}>
              {submissions.map((s) => (
                <div key={s.id} className={styles.subRow}>
                  <div className={styles.subInfo}>
                    <span className={`badge badge-${s.status}`}>{s.status}</span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      <CopyAddress address={s.seller_wallet} />
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      {s.submitted_at ? new Date(s.submitted_at).toLocaleString() : ''}
                    </span>
                  </div>
                    <div className={styles.subChecks}>
                      <Check label="Static" passed={s.static_passed} />
                      <Check label="Sandbox" passed={s.sandbox_passed} />
                      <Check label="Jury" passed={s.jury_passed} />
                      <button 
                        className={styles.evidenceBtn}
                        onClick={() => openEvidence(s.id)}
                        disabled={evidenceLoading}
                        title="View Detailed Logs"
                      >
                        {evidenceLoading && selectedSub?.id === s.id ? 'Loading...' : 'Evidence'}
                      </button>
                      {s.nft_id && (
                        <a 
                          href={s.nft_asset_url || `https://testnet.explorer.perawallet.app/asset/${s.nft_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.nftBadge}
                          title="View On-Chain Mastery NFT"
                        >
                          <Award size={12} /> NFT
                        </a>
                      )}
                      {role === 'buyer' && s.status === 'passed' && (
                        <button 
                          className={styles.disputeBtn}
                          onClick={() => handleDispute(s.id)}
                          title="Challenge AI Verdict"
                        >
                          <AlertTriangle size={12} /> Challenge
                        </button>
                      )}
                      {s.settlement_time && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        {s.settlement_time.toFixed(1)}s
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {selectedSub && (
        <EvidenceModal 
          data={selectedSub} 
          onClose={() => setSelectedSub(null)} 
        />
      )}
    </div>
    </ProfileGate>
  );
}

function Check({ label, passed }: { label: string; passed?: boolean | null }) {
  return (
    <span className={styles.check}>
      {passed === true ? (
        <CheckCircle size={12} style={{ color: 'var(--accent-primary)' }} />
      ) : passed === false ? (
        <XCircle size={12} style={{ color: 'var(--accent-danger)' }} />
      ) : (
        <AlertTriangle size={12} style={{ color: 'var(--text-tertiary)' }} />
      )}
      <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
    </span>
  );
}
