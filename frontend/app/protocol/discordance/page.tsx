'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, GitCompare, Zap, 
  Users, AlertTriangle, CheckCircle,
  FileText, Activity, Info
} from 'lucide-react';
import styles from './page.module.css';

export default function DiscordanceHub() {
  const [loading, setLoading] = useState(false);
  
  // Mocked state for institutional presentation
  const discordanceMetrics = {
    total_disputes: 142,
    ai_human_alignment: '94.2%',
    divergence_count: 8,
    avg_resolution_delta: '12m'
  };

  const divergences = [
    { id: 'SUB-102', bounty: 'EVM Smart Contract Audit', reason: 'Fringe case logic error', ai_verdict: 'FAIL (82%)', human_verdict: 'PASS (Unanimous)', delta: 'High' },
    { id: 'SUB-085', bounty: 'UI/UX Design - Fintech', reason: 'Color contrast edge case', ai_verdict: 'WARNING', human_verdict: 'PASS (4-1)', delta: 'Low' },
    { id: 'SUB-114', bounty: 'Legal Document Analysis', reason: 'Ambiguous phrasing', ai_verdict: 'FAIL', human_verdict: 'PASS (Split)', delta: 'Medium' }
  ];

  return (
    <div className="page-container">
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <div className="badge badge-active" style={{ marginBottom: '12px' }}>
            <GitCompare size={12} fill="currentColor" /> Institutional Intelligence
          </div>
          <h1 className={styles.title}>Discordance & Audit Hub</h1>
          <p className={styles.subtitle}>
            VORTEX Protocol integrity metrics. Analyzing the variance between 
            Multi-Modal AI results and Human Arbiter consensus.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className="btn btn-secondary btn-sm"><FileText size={14} /> Export Institutional PDF</button>
        </div>
      </div>

      <div className={styles.metricRow}>
        <MetricCard label="AI/Human Alignment" value={discordanceMetrics.ai_human_alignment} icon={<Zap size={18} color="var(--accent-primary)" />} />
        <MetricCard label="Divergence Cases" value={discordanceMetrics.divergence_count} icon={<ShieldAlert size={18} color="var(--accent-danger)" />} />
        <MetricCard label="Audit Velocity" value={discordanceMetrics.avg_resolution_delta} icon={<Activity size={18} color="var(--accent-info)" />} />
      </div>

      <div className={styles.content}>
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}><Users size={18} /> Divergence Index</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            The following cases represent a significant discordance between the AI Jury and the Human Neural Court. 
            All cases listed have been flagged for senior institutional review.
          </p>
          
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Submission</th>
                  <th>Bounty Category</th>
                  <th>AI Verdict</th>
                  <th>Human Verdict</th>
                  <th>Discordance</th>
                  <th>Root Cause</th>
                </tr>
              </thead>
              <tbody>
                {divergences.map((d, i) => (
                  <tr key={i}>
                    <td className={styles.subId}>{d.id}</td>
                    <td className={styles.cat}>{d.bounty}</td>
                    <td className={styles.aiVer}>{d.ai_verdict}</td>
                    <td className={styles.humanVer}>{d.human_verdict}</td>
                    <td>
                      <span className={`${styles.deltaBadge} ${styles['delta' + d.delta]}`}>{d.delta}</span>
                    </td>
                    <td className={styles.reason}>{d.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.infoSection}>
          <div className={styles.infoCard}>
            <h4 style={{ margin: '0 0 8px 0' }}><Info size={16} /> Neural Consensus Model</h4>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              VORTEX uses a 'Cascading Logic' model. While the AI Jury provides the primary verification layer, 
              Human Arbiters hold the ultimate sovereign power. Divergences are logged as training data 
              for the VORTEX Institutional Neural layers.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon }: any) {
  return (
    <div className={styles.metricCard}>
      <div className={styles.mHeader}>
        {icon}
        <span className={styles.mLabel}>{label}</span>
      </div>
      <div className={styles.mValue}>{value}</div>
    </div>
  );
}
