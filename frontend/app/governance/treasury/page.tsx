'use client';

import React, { useState, useEffect } from 'react';
import { getTreasuryStats, type TreasuryStats } from '@/lib/api';
import { 
  DollarSign, TrendingUp, BarChart3, 
  ArrowUpRight, ShieldCheck, Activity,
  Globe, Clock, Layers
} from 'lucide-react';
import styles from './page.module.css';

export default function TreasuryPage() {
  const [stats, setStats] = useState<TreasuryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await getTreasuryStats();
        setStats(res.data);
      } catch {
        // demo fallback
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="page-container">
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <div className="badge badge-active" style={{ marginBottom: '16px' }}>
            <Activity size={12} fill="currentColor" /> Economic Sovereignty
          </div>
          <h1 className={styles.title}>DAO Treasury Engine</h1>
          <p className={styles.subtitle}>
            VORTEX Protocol liquidity telemetry. Real-time visualization of 
            accrued platform fees, reward velocity, and on-chain escrow reserves.
          </p>
        </div>
        <div className={styles.headerScore}>
          <div className={styles.scoreCircle}>
            <span className={styles.scoreVal}>AA+</span>
            <span className={styles.scoreLabel}>Protocol Rating</span>
          </div>
        </div>
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.primaryStats}>
          <div className={styles.heroCard}>
            <div className={styles.heroIcon}><DollarSign size={24} /></div>
            <div className={styles.heroInfo}>
              <span className={styles.heroLabel}>Net Protocol Reserve</span>
              <span className={styles.heroVal}>{(stats?.net_protocol_reserve || 0).toFixed(2)} ALGO</span>
            </div>
          </div>

          <div className={styles.statsGrid}>
            <StatCard 
              label="Cumulative Fees" 
              value={`${(stats?.protocol_fees_accrued || 0).toFixed(2)}`} 
              unit="ALGO"
              icon={<TrendingUp size={16} />}
              detail="+2% Consensus Tax" 
            />
            <StatCard 
              label="Active Escrow" 
              value={`${(stats?.active_liquid_escrow || 0).toFixed(0)}`} 
              unit="ALGO"
              icon={<Layers size={16} />}
              detail="Secured in Smart Contracts" 
            />
            <StatCard 
              label="Distributed Rewards" 
              value={`${(stats?.arbitration_rewards_distributed || 0).toFixed(2)}`} 
              unit="ALGO"
              icon={<ShieldCheck size={16} />}
              detail="Allocated to Arbiters" 
            />
            <StatCard 
              label="Protocol Velocity" 
              value={`${(stats?.velocity_30d || 0).toFixed(1)}`} 
              unit="x"
              icon={<BarChart3 size={16} />}
              detail="Rolling 30-day Volume" 
            />
          </div>
        </div>

        <aside className={styles.complianceSidebar}>
          <div className={styles.complianceCard}>
            <h3 className={styles.cardTitle}><Globe size={18} /> Global Finality</h3>
            <p className={styles.cardText}>
              The VORTEX Protocol ensures sub-4 second settlement finality by leveraging 
              the Algorand Pure Proof-of-Stake consensus layer.
            </p>
            <div className={styles.finalityMeter}>
              <div className={styles.meterFill} style={{ width: '99.9%' }} />
              <span>99.9% Uptime</span>
            </div>
          </div>

          <div className={styles.auditLog}>
            <h3 className={styles.cardTitle}><Clock size={18} /> Fiscal Activity Feed</h3>
            <div className={styles.auditList}>
              <AuditItem msg="Protocol Fee Accrued (Settlement #042)" delta="+0.42 ALGO" />
              <AuditItem msg="Arbiter Reward Released" delta="-0.15 ALGO" />
              <AuditItem msg="New Escrow Locked (ID: B-998)" delta="+25.00 ALGO" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatCard({ label, value, unit, icon, detail }: any) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statHeader}>
        <div className={styles.statIcon}>{icon}</div>
        <span className={styles.statLabel}>{label}</span>
      </div>
      <div className={styles.statValueGroup}>
        <span className={styles.statVal}>{value}</span>
        <span className={styles.statUnit}>{unit}</span>
      </div>
      <p className={styles.statDetail}>{detail}</p>
    </div>
  );
}

function AuditItem({ msg, delta }: { msg: string, delta: string }) {
  const isPos = delta.startsWith('+');
  return (
    <div className={styles.auditItem}>
      <span className={styles.auditMsg}>{msg}</span>
      <span className={isPos ? styles.auditDeltaPos : styles.auditDeltaNeg}>{delta}</span>
    </div>
  );
}
