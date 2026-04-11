'use client';

import React, { useState, useEffect } from 'react';
import { 
  Shield, Cpu, Network, Database, 
  Activity, CheckCircle, Lock, Server,
  RefreshCw, Globe
} from 'lucide-react';
import styles from './page.module.css';

export default function OracleSystemPage() {
  const [nodes, setNodes] = useState([
    { id: 1, name: 'VORTEX-ORC-01', location: 'Frankfurt, DE', status: 'ready', latency: '42ms', uptime: '99.99%', version: 'v2.2.0' },
    { id: 2, name: 'VORTEX-ORC-02', location: 'Singapore, SG', status: 'ready', latency: '128ms', uptime: '99.95%', version: 'v2.2.0' },
    { id: 3, name: 'VORTEX-ORC-03', location: 'San Francisco, US', status: 'ready', latency: '85ms', uptime: '99.98%', version: 'v2.2.0' },
  ]);

  const [traces, setTraces] = useState<string[]>([
    '> [ORC-01] Indexer synchronized to block 38,492,012',
    '> [ORC-02] Signature verified for Settlement TX 5X2...8A',
    '> [ORC-03] Quorum reached for Bounty Dispute D-102',
    '> [GLOBAL] Consensus engine standby.'
  ]);

  const [loading, setLoading] = useState(false);

  return (
    <div className="page-container">
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <div className="badge badge-active" style={{ marginBottom: '12px' }}>
            <Server size={12} fill="currentColor" /> System Sovereignty
          </div>
          <h1 className={styles.title}>Oracle Control Center</h1>
          <p className={styles.subtitle}>
            Distributed diagnostic engine for the 3-node VORTEX Oracle stack. 
            Verifying Ed25519 cryptographic finality on Algorand.
          </p>
        </div>
        <div className={styles.headerStats}>
          <div className={styles.hStatCard}>
            <span className={styles.hStatLabel}>Quorum Status</span>
            <span className={styles.hStatVal} style={{ color: 'var(--accent-primary)' }}>3 / 3 Ready</span>
          </div>
          <div className={styles.hStatCard}>
            <span className={styles.hStatLabel}>Network Finality</span>
            <span className={styles.hStatVal}>3.9s</span>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Node Grid */}
        <div className={styles.nodeGrid}>
          {nodes.map(node => (
            <div key={node.id} className={styles.nodeCard}>
              <div className={styles.nodeHeader}>
                <div className={styles.nodeIcon}>
                  <Cpu size={24} />
                </div>
                <div className={styles.nodeTitleGroup}>
                  <div className={styles.nodeName}>{node.name}</div>
                  <div className={styles.nodeLoc}><Globe size={10} /> {node.location}</div>
                </div>
                <div className={styles.nodeStatus}>
                  <CheckCircle size={14} color="var(--accent-primary)" />
                </div>
              </div>
              <div className={styles.nodeMetrics}>
                <Metric label="Latency" value={node.latency} />
                <Metric label="Uptime" value={node.uptime} />
                <Metric label="Protocol" value={node.version} />
              </div>
              <div className={styles.nodeActivity}>
                <div className={styles.pulse} />
                <span>Synchronized with Indexer</span>
              </div>
            </div>
          ))}
        </div>

        {/* Live Traces */}
        <div className={styles.traceSection}>
          <h3 className={styles.sectionTitle}><Activity size={18} /> Consensus Trace</h3>
          <div className={styles.terminal}>
            {traces.map((t, i) => (
              <div key={i} className={styles.termLine}>{t}</div>
            ))}
            <div className={styles.cursorLine}>
              <span className={styles.cursor}>▌</span>
            </div>
          </div>

          <div className={styles.securitySeal}>
            <Shield size={24} color="var(--accent-primary)" style={{ opacity: 0.5 }} />
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '0.875rem' }}>Cryptographic Proof-of-Action</h4>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                All oracle decisions require Ed25519 signatures from a majority of nodes. 
                Signatures are cross-referenced with local Algorand Indexer state for total truth.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string, value: string }) {
  return (
    <div className={styles.metric}>
      <span className={styles.mLabel}>{label}</span>
      <span className={styles.mValue}>{value}</span>
    </div>
  );
}
