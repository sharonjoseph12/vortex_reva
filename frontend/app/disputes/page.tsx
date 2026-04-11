'use client';

import { useEffect, useState } from 'react';
import { listDisputes, voteDispute, type DisputeData } from '@/lib/api';
import { truncateAddress } from '@/lib/wallet';
import { useAuthStore } from '@/lib/store';
import {
  Scale, Shield, ThumbsUp, ThumbsDown,
  AlertTriangle, CheckCircle, Users
} from 'lucide-react';
import CopyAddress from '@/components/CopyAddress';
import { toast } from 'sonner';
import styles from './page.module.css';

export default function DisputesPage() {
  const { wallet } = useAuthStore();
  const [disputes, setDisputes] = useState<DisputeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [voteStake, setVoteStake] = useState('1.0');
  const [voting, setVoting] = useState(false);
  const [voteMsg, setVoteMsg] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await listDisputes();
      setDisputes(res.data.disputes);
    } catch {
      // backend down
    } finally {
      setLoading(false);
    }
  }

  async function handleVote(disputeId: string, vote: 'release' | 'refund') {
    setVoting(true);
    setVoteMsg('');
    try {
      const res = await voteDispute(disputeId, vote, parseFloat(voteStake));
      toast.success(`Vote recorded! Total votes: ${res.data.total_votes}`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Vote failed');
    } finally {
      setVoting(false);
    }
  }

  const selected = disputes.find((d) => d.id === selectedId);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">
          <Scale size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
          Governance &amp; Disputes
        </h1>
        <p className="page-subtitle">Community arbitration with stake-weighted voting</p>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 'var(--space-2xl)' }}>
        <div className="stat-card">
          <div className="stat-label">Active Disputes</div>
          <div className="stat-value">{disputes.filter((d) => d.status === 'active').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Disputes</div>
          <div className="stat-value">{disputes.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Staked</div>
          <div className="stat-value">
            {disputes.reduce((s, d) => s + d.total_staked, 0).toFixed(1)}
            <span className="stat-unit">ALGO</span>
          </div>
        </div>
      </div>

      <div className={styles.layout}>
        {/* Dispute List */}
        <div className={styles.list}>
          <div className="section-title">Active Disputes</div>
          {loading ? (
            <div className="empty-state">
              <div className="loading-pulse" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                Loading...
              </div>
            </div>
          ) : disputes.length === 0 ? (
            <div className="empty-state">
              <Shield size={48} color="var(--border-color)" style={{ opacity: 0.5, marginBottom: '16px' }} />
              <div className="empty-state-text" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '1px' }}>
                NO ACTIVE ANOMALIES
              </div>
            </div>
          ) : (
            <div className={styles.disputeList}>
              {disputes.map((d) => (
                <button
                  key={d.id}
                  className={`${styles.disputeRow} ${selectedId === d.id ? styles.disputeRowActive : ''}`}
                  onClick={() => setSelectedId(d.id)}
                >
                  <div className={styles.disputeInfo}>
                    <span className={`badge badge-${d.status === 'active' ? 'pending' : 'settled'}`}>
                      {d.status}
                    </span>
                    <span className={styles.disputeId}>
                      Dispute #{d.id.slice(0, 8)}
                    </span>
                  </div>
                  <div className={styles.disputeMeta}>
                    <div className={styles.voteBar}>
                      <span style={{ color: 'var(--accent-primary)' }}>{d.release_votes}</span>
                      <span style={{ color: 'var(--text-tertiary)' }}>/</span>
                      <span style={{ color: 'var(--accent-danger)' }}>{d.refund_votes}</span>
                    </div>
                    <Users size={12} style={{ color: 'var(--text-tertiary)' }} />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                      {d.arbiter_count}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className={styles.detail}>
          {selected ? (
            <>
              <div className={styles.detailHeader}>
                <span className="data-marker">Dispute #{selected.id.slice(0, 8)}</span>
                <span className={`badge badge-${selected.status === 'active' ? 'pending' : 'settled'}`}>
                  {selected.status}
                </span>
              </div>

              <div className={styles.detailSection}>
                <span className={styles.detailLabel}>Bounty</span>
                <span className={styles.detailValue}>{selected.bounty_id.slice(0, 12)}...</span>
              </div>

              <div className={styles.detailSection}>
                <span className={styles.detailLabel}>Initiator</span>
                <span className={styles.detailValue}>
                  <CopyAddress address={selected.initiator_wallet} />
                </span>
              </div>

              {selected.buyer_claim && (
                <div className={styles.detailSection}>
                  <span className={styles.detailLabel}>Buyer Claim</span>
                  <p className={styles.claim}>{selected.buyer_claim}</p>
                </div>
              )}

              {selected.seller_claim && (
                <div className={styles.detailSection}>
                  <span className={styles.detailLabel}>Seller Claim</span>
                  <p className={styles.claim}>{selected.seller_claim}</p>
                </div>
              )}

              {/* Vote Breakdown */}
              <div className={styles.voteSection}>
                <div className={styles.voteSide}>
                  <ThumbsUp size={16} style={{ color: 'var(--accent-primary)' }} />
                  <span className={styles.voteCount} style={{ color: 'var(--accent-primary)' }}>
                    {selected.release_votes}
                  </span>
                  <span className={styles.voteLabel}>Release</span>
                </div>
                <div className={styles.vsBar}>
                  <div
                    className={styles.vsBarFill}
                    style={{
                      width: `${selected.release_votes + selected.refund_votes > 0
                        ? (selected.release_votes / (selected.release_votes + selected.refund_votes)) * 100
                        : 50}%`,
                    }}
                  />
                </div>
                <div className={styles.voteSide}>
                  <ThumbsDown size={16} style={{ color: 'var(--accent-danger)' }} />
                  <span className={styles.voteCount} style={{ color: 'var(--accent-danger)' }}>
                    {selected.refund_votes}
                  </span>
                  <span className={styles.voteLabel}>Refund</span>
                </div>
              </div>

              {/* Cast Vote */}
              {selected.status === 'active' && (
                <div className={styles.castVote}>
                  <span className="data-marker">Cast Your Vote</span>
                  <div className={styles.stakeInput}>
                    <label className="input-label">Stake (ALGO)</label>
                    <input
                      className="input"
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={voteStake}
                      onChange={(e) => setVoteStake(e.target.value)}
                    />
                  </div>
                  <div className={styles.voteActions}>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleVote(selected.id, 'release')}
                      disabled={voting}
                    >
                      <ThumbsUp size={14} /> Release
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleVote(selected.id, 'refund')}
                      disabled={voting}
                    >
                      <ThumbsDown size={14} /> Refund
                    </button>
                  </div>
                  {voteMsg && (
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.78rem',
                      color: voteMsg.includes('failed') ? 'var(--accent-danger)' : 'var(--accent-primary)',
                      marginTop: 'var(--space-sm)',
                    }}>
                      {voteMsg}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <AlertTriangle size={32} style={{ opacity: 0.2 }} />
              <div className="empty-state-text" style={{ marginTop: '12px' }}>
                Select a dispute to review
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
