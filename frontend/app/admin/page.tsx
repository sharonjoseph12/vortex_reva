'use client';

import { useEffect, useState } from 'react';
import { getProtocolMetrics, getTreasuryStats, type ProtocolMetrics, type TreasuryStats } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { 
  BarChart3, Activity, Shield, TrendingUp, 
  Wallet, Layers, Fingerprint, PieChart 
} from 'lucide-react';
import styles from './page.module.css';

export default function AdminDashboard() {
  const { wallet } = useAuthStore();
  const [metrics, setMetrics] = useState<ProtocolMetrics | null>(null);
  const [treasury, setTreasury] = useState<TreasuryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [m, t] = await Promise.all([
          getProtocolMetrics(),
          getTreasuryStats()
        ]);
        setMetrics(m.data);
        setTreasury(t.data);
      } catch (e) {
        console.error('Failed to load administrative metrics');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="page-container">Loading protocol metrics...</div>;

  return (
    <div className="page-container">
      <div className={styles.header}>
        <div className={styles.titleLine}>
           <Fingerprint size={24} color="var(--accent-primary)" />
           <h1>Founder Dashboard</h1>
        </div>
        <p className={styles.subtitle}>Sovereign Protocol Real-Time Analytics</p>
      </div>

      <div className={styles.statsGrid}>
        <MetricCard 
          icon={<BarChart3 />} 
          label="Total Volume" 
          value={`${treasury?.total_volume_algo || 0} ALGO`} 
          trend="+12% vs last 7d" 
        />
        <MetricCard 
          icon={<TrendingUp />} 
          label="Protocol Fees" 
          value={`${treasury?.protocol_fees_accrued || 0} ALGO`} 
          trend="Accumulated Reserve" 
        />
        <MetricCard 
          icon={<Activity />} 
          label="Consensus Velocity" 
          value={`${metrics?.consensus_velocity_hours || 0} hrs`} 
          trend="Mean Finality Time" 
        />
        <MetricCard 
          icon={<Shield />} 
          label="Health Score" 
          value={`${metrics?.health_score || 0}%`} 
          trend="System Integrity" 
        />
      </div>

      <div className={styles.detailsRow}>
        <div className={styles.chartBox}>
          <div className={styles.boxHeader}>
            <PieChart size={16} />
            <span>Treasury Allocation</span>
          </div>
          <div className={styles.mockChart}>
            <div className={styles.chartBar} style={{ width: '70%', background: 'var(--accent-primary)' }}>Escrow</div>
            <div className={styles.chartBar} style={{ width: '20%', background: 'var(--accent-secondary)' }}>Reserves</div>
            <div className={styles.chartBar} style={{ width: '10%', background: 'var(--text-tertiary)' }}>Insurance</div>
          </div>
        </div>

        <div className={styles.infoBox}>
          <div className={styles.boxHeader}>
            <Layers size={16} />
            <span>Node Governance</span>
          </div>
          <div className={styles.nodeList}>
             <div className={styles.nodeItem}><span>Oracle #1 (Primary)</span> <span className={styles.statusOnline}>ONLINE</span></div>
             <div className={styles.nodeItem}><span>Oracle #2 (Consensus)</span> <span className={styles.statusOnline}>ONLINE</span></div>
             <div className={styles.nodeItem}><span>Oracle #3 (Settler)</span> <span className={styles.statusOnline}>ONLINE</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, trend }: any) {
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricHeader}>
        <div className={styles.metricIcon}>{icon}</div>
        <span className={styles.metricLabel}>{label}</span>
      </div>
      <div className={styles.metricValue}>{value}</div>
      <div className={styles.metricTrend}>{trend}</div>
    </div>
  );
}
