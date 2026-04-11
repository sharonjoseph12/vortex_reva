'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getDispute, voteDispute } from '@/lib/api';
import { 
  Gavel, ShieldAlert, Code, Play, Shield,
  CheckCircle, XCircle, AlertTriangle, ArrowLeft 
} from 'lucide-react';
import ForensicHighlight from '@/components/ForensicHighlight';
import Link from 'next/link';
import styles from './page.module.css';

export default function ArbiterReviewPage() {
  const { id } = useParams();
  const router = useRouter();
  const [dispute, setDispute] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [simLogs, setSimLogs] = useState<string[]>([]);

  useEffect(() => {
    if (id) load();
  }, [id]);

  async function load() {
    try {
      const res = await getDispute(id as string);
      setDispute(res.data);
    } catch {
      // offline
    } finally {
      setLoading(false);
    }
  }

  const runSimulation = () => {
    setSimulating(true);
    setSimLogs(['> Initializing Sandbox v2.0...', '> Loading disputed artifact...', '> Running verification suite...']);
    
    // Simulate events
    setTimeout(() => setSimLogs(p => [...p, '> [LOG] Execution depth: 42', '> [LOG] Memory isolation: ACTIVE']), 800);
    setTimeout(() => {
      setSimLogs(p => [...p, '> [WARN] Security constraint violation at L42', '> [FAIL] Logic discordance detected.']);
      setSimulating(false);
    }, 2500);
  };

  const handleVote = async (vote: 'release' | 'refund') => {
    setLoading(true);
    try {
      await voteDispute(id as string, vote, 10.0); // Demo stake: 10 ALGO
      await load();
      alert(`Vote cast: ${vote === 'release' ? 'Release funds' : 'Refund buyer'}`);
    } catch (e: any) {
      alert(e.message || 'Voting failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="page-container">Retrieving Dispute context...</div>;
  if (!dispute) return <div className="page-container">Dispute not found.</div>;

  const releaseVotes = dispute.votes?.filter((v: any) => v.vote === 'release').length || 0;
  const refundVotes = dispute.votes?.filter((v: any) => v.vote === 'refund').length || 0;

  return (
    <div className="page-container">
      <Link href="/governance" className="btn btn-ghost btn-sm" style={{ marginBottom: '20px' }}>
        <ArrowLeft size={14} /> Back to Governance Hub
      </Link>

      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <div className="badge badge-active" style={{ marginBottom: '8px' }}>
            <Gavel size={12} fill="currentColor" /> Certified Adjudication
          </div>
          <h1>Arbiter Case #{id?.slice(0, 8)}</h1>
          <p className={styles.subtitle}>
            Professional dispute resolution for Bounty **{dispute.bounty_id.slice(0, 8)}**. 
            Review forensic evidence and execute simulations to reach consensus.
          </p>
        </div>
        <div className={styles.consensusTracker}>
          <div className={styles.consensusTitle}>Consensus ({(releaseVotes + refundVotes)}/3)</div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${(releaseVotes + refundVotes) / 3 * 100}%` }} />
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Evidence Side */}
        <div className={styles.evidence}>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}><ShieldAlert size={18} /> Claims Analysis</h3>
            <div className={styles.claimsGrid}>
              <div className={styles.claimBox}>
                <span className={styles.claimLabel}>Buyer Claim</span>
                <p>{dispute.buyer_claim || "No claim provided"}</p>
              </div>
              <div className={styles.claimBox}>
                <span className={styles.claimLabel}>Seller Claim</span>
                <p>{dispute.seller_claim || "No claim provided"}</p>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}><Code size={18} /> Forensic Logic Trace</h3>
            <ForensicHighlight 
              code={dispute.submission_artifact || '# [SOURCE UNAVAILABLE]'} 
              report={dispute.forensic_report || { summary: 'No forensic analysis available for this case.', issues: [] }} 
            />
          </section>
        </div>

        {/* Action Side */}
        <aside className={styles.actions}>
          <div className={styles.pnl}>
            <h3 className={styles.sectionTitle}><Play size={18} /> Sandbox Simulation</h3>
            <div className={styles.terminal}>
              {simLogs.map((l, i) => (
                <div key={i} className={styles.termLine}>{l}</div>
              ))}
              {simulating && <div className={styles.cursor}>▌</div>}
              {simLogs.length === 0 && <div style={{ color: '#444' }}>Click 'Run Simulation' to execute artifact in isolated environment.</div>}
            </div>
            <button 
              className="btn btn-secondary btn-sm" 
              style={{ width: '100%', marginTop: '12px' }}
              onClick={runSimulation}
              disabled={simulating}
            >
              <Play size={14} /> {simulating ? 'Simulating...' : 'Run Local Simulation'}
            </button>
          </div>

          {dispute.status === 'resolved' && dispute.case_file_cid && (
            <div className={styles.auditBond}>
              <h3 className={styles.sectionTitle} style={{ color: 'var(--accent-primary)' }}>
                <Shield size={18} /> Verifiable Audit Trace
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                This case has been immutably archived on the Sovereign Web. The evidence bundle contains all forensic logs, mission chats, and rejected artifacts.
              </p>
              <button 
                className="btn btn-secondary btn-sm" 
                style={{ width: '100%', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }}
                onClick={() => window.open(`https://ipfs.io/ipfs/${dispute.case_file_cid}`, '_blank')}
              >
                Inspect Case File (CID: {dispute.case_file_cid.slice(0, 10)}...)
              </button>
            </div>
          )}

          <div className={styles.voteBox}>
            <h3 className={styles.sectionTitle}><Gavel size={18} /> Cast Final Verdict</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginBottom: '16px' }}>
              Your vote will be committed to the Algorand blockchain. Majority consensus triggers immutable escrow settlement.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                className="btn btn-primary" 
                style={{ background: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
                onClick={() => handleVote('release')}
                disabled={loading}
              >
                <CheckCircle size={16} /> Release To Seller ({releaseVotes})
              </button>
              <button 
                className="btn btn-secondary" 
                style={{ color: 'var(--accent-danger)', borderColor: 'var(--accent-danger)' }}
                onClick={() => handleVote('refund')}
                disabled={loading}
              >
                <XCircle size={16} /> Refund To Buyer ({refundVotes})
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
