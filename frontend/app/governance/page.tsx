'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { listDisputes, voteDispute, type DisputeData } from '@/lib/api';
import { Gavel, Scale, AlertTriangle, CheckCircle, XCircle, Clock, Users, Shield, ArrowRight, Activity, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import ExplorerLink from '@/components/ExplorerLink';
import styles from './page.module.css';

export default function GovernancePage() {
  const { wallet, role } = useAuthStore();
  const [disputes, setDisputes] = useState<DisputeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await listDisputes();
        setDisputes(res.data.disputes);
      } catch (e) {
        console.error("Governance feed down", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleVote(disputeId: string, vote: 'release' | 'refund') {
    setVoting(disputeId);
    setError('');
    try {
      await voteDispute(disputeId, vote, 2.0); // Fixed 2.0 ALGO stake for Arbiters
      // Refresh
      const res = await listDisputes();
      setDisputes(res.data.disputes);
    } catch (e: any) {
      setError(e.message || "Voting failed");
    } finally {
      setVoting(null);
    }
  }

  return (
    <div className="page-container" style={{ maxWidth: '1000px' }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
          <div style={{ padding: '8px', background: 'var(--accent-secondary-dim)', borderRadius: '12px', color: 'var(--accent-secondary)' }}>
            <Gavel size={24} />
          </div>
          <h1 className="page-title" style={{ margin: 0 }}>VORTEX Governance DAO</h1>
        </div>
        <p className="page-subtitle">Decentralized adjudication of mission disputes. Elite status required.</p>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <Users size={20} />
          <div>
            <div className={styles.statLabel}>Active Arbiters</div>
            <div className={styles.statValue}>42</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <Activity size={20} />
          <div>
            <div className={styles.statLabel}>Consensus Rate</div>
            <div className={styles.statValue}>98.4%</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <TrendingUp size={20} />
          <div>
            <div className={styles.statLabel}>Total Finalized</div>
            <div className={styles.statValue}>1,240 <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>ALGO</span></div>
          </div>
        </div>
      </div>

      {error && (
        <div className={styles.errorBox}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="section">
        <h3 className="section-title">Active Dispute Cases</h3>
        
        {loading ? (
          <div className="spinner-container"><div className="spinner" /></div>
        ) : disputes.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '64px' }}>
            <Shield size={48} color="var(--accent-primary)" style={{ opacity: 0.3, marginBottom: '16px' }} />
            <h3 style={{ margin: 0 }}>Protocol Harmony</h3>
            <p style={{ color: 'var(--text-tertiary)' }}>No active disputes detected in the escrow pipeline.</p>
          </div>
        ) : (
          <div className={styles.disputeGrid}>
            {disputes.map((d) => (
              <div key={d.id} className={styles.disputeCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.caseId}>CASE: #{d.id.slice(0, 8)}</div>
                  <div className={styles.caseStatus}>
                    <Activity size={12} className={styles.ping} /> LIVE CONFLICT
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <h4 className={styles.bountyTitle}>Bounty ID: {d.bounty_id.split('-')[0]}...</h4>
                  <div className={styles.evidenceLink}>
                    <Link href={`/bounties/${d.bounty_id}`}>
                      View Forensic Evidence <ArrowRight size={12} />
                    </Link>
                  </div>

                  <div className={styles.progressSection}>
                    <div className={styles.progressLabels}>
                      <span>Consensus Quorum</span>
                      <span>{d.arbiter_count}/3 Votes</span>
                    </div>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: `${(d.arbiter_count / 3) * 100}%` }} />
                    </div>
                  </div>

                  <div className={styles.voteSummary}>
                    <div className={styles.voteLabel}><CheckCircle size={14} color="var(--accent-primary)" /> Release: {d.release_votes}</div>
                    <div className={styles.voteLabel}><XCircle size={14} color="var(--accent-danger)" /> Refund: {d.refund_votes}</div>
                  </div>
                </div>

                <div className={styles.cardActions}>
                  <button 
                    className={`${styles.voteBtn} ${styles.releaseBtn}`}
                    onClick={() => handleVote(d.id, 'release')}
                    disabled={voting === d.id}
                  >
                    Release to Solver
                  </button>
                  <button 
                    className={`${styles.voteBtn} ${styles.refundBtn}`}
                    onClick={() => handleVote(d.id, 'refund')}
                    disabled={voting === d.id}
                  >
                    Refund to Buyer
                  </button>
                </div>

                {voting === d.id && (
                  <div className={styles.votingOverlay}>
                    <div className="spinner" />
                    <span>Signing Decision...</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: '32px', border: '1px dashed var(--border-color)', background: 'transparent' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Scale size={32} color="var(--text-tertiary)" />
          <div>
            <h4 style={{ margin: 0 }}>Economic Guardrails</h4>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
              Arbiters must stake 2.0 ALGO per vote. Correct decisions are rewarded with a share of the slashed dispute stake. 
              Incorrect minority votes are slashed to maintain truth-consensus.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
