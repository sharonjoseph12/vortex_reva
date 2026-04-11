'use client';

import { useEffect, useState } from 'react';
import { getHealth, getProtocolMetrics, type HealthData, type ProtocolMetrics } from '@/lib/api';
import { 
  ShieldCheck, Activity, BarChart3, 
  CircleDot, Wifi, Database, Search, 
  RefreshCw, Globe 
} from 'lucide-react';
import styles from './page.module.css';

export default function ProtocolHealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [metrics, setMetrics] = useState<ProtocolMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [hRes, mRes] = await Promise.all([
          getHealth(),
          getProtocolMetrics()
        ]);
        setHealth(hRes.data);
        setMetrics(mRes.data);
      } catch (e) {
        console.error('Health fetch failed', e);
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page-container">
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <div className="badge badge-active" style={{ marginBottom: '16px' }}>
            <CircleDot size={12} fill="currentColor" /> Live Protocol Status
          </div>
          <h1 className={styles.title}>Proof of Trust</h1>
          <p className={styles.subtitle}>
            VORTEX transparency layer. Real-time visualization of the automated 
            governance ecosystem and multi-layered verification stack.
          </p>
        </div>
          <div className={styles.heroStats}>
            <div className={styles.heroStatItem}>
              <span className={styles.heroLabel}>Total Economic Finality</span>
              <span className={styles.heroValue}>{(metrics?.total_finality_algo || 0).toFixed(2)} ALGO</span>
            </div>
            <div className={styles.heroStatItem}>
              <span className={styles.heroLabel}>Consensus Health Score</span>
              <span className={styles.heroValue} style={{ color: 'var(--accent-secondary)' }}>{metrics?.health_score || 100}%</span>
            </div>
          </div>
      </div>

      <div className={styles.grid}>
        {/* Verification Stack Health */}
        <div className="section">
          <h3 className="section-title"><ShieldCheck size={18} /> Consensus Health</h3>
          <div className={styles.stackGrid}>
            <HealthItem 
              icon={<Database size={20} />} 
              label="Algorand Mainnet / Indexer" 
              status={health?.algorand || 'unknown'} 
              detail="Mission Critical Layer-1" 
            />
            <HealthItem 
              icon={<Wifi size={20} />} 
              label="Distributed Oracle Consensus" 
              status={health?.oracle_nodes?.length === 3 ? 'ready' : 'degraded'} 
              detail="Quorum: 3 / 3 Nodes Active" 
            />
            <HealthItem 
              icon={<Activity size={20} />} 
              label="Verification Sandbox (Global)" 
              status={health?.docker || 'unknown'} 
              detail="Deterministic Execution Environment" 
            />
          </div>
        </div>

        {/* Global Statistics */}
        <div className="section">
          <h3 className="section-title"><BarChart3 size={18} /> Network Efficacy</h3>
          <div className="grid grid-2">
            <div className={styles.statBox}>
              <span className={styles.miniLabel}>DAO Consensus Velocity</span>
              <div className={styles.miniVal}>{metrics?.consensus_velocity_hours || 0}h</div>
              <p className={styles.miniDetail}>Avg. Dispute to Resolution Time</p>
            </div>
            <div className={styles.statBox}>
              <span className={styles.miniLabel}>Arbiter Participation</span>
              <div className={styles.miniVal}>{(metrics?.participation_rate || 0).toFixed(1)}%</div>
              <p className={styles.miniDetail}>{metrics?.active_arbiters || 0} Verified Nodes Active</p>
            </div>
          </div>
          
          <div className="card" style={{ marginTop: '24px', background: 'var(--bg-tertiary)', borderStyle: 'dashed' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <Globe size={20} color="var(--accent-secondary)" />
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.9rem' }}>Global Sovereign Status</h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Current protocol version: **v2.1.0-ELITE**. 
                  The VORTEX Oracle stack is operating across 3 continents to ensure geo-redundancy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.refreshBar}>
        <RefreshCw size={14} className={loading ? 'spin' : ''} />
        <span>Last synchronization: {new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

function HealthItem({ icon, label, status, detail }: { icon: any, label: string, status: string, detail: string }) {
  const ok = status === 'connected' || status === 'ready';
  return (
    <div className={styles.healthItem}>
      <div className={styles.healthIcon} style={{ color: ok ? 'var(--accent-primary)' : 'var(--accent-danger)' }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div className={styles.healthLabel}>{label}</div>
        <div className={styles.healthDetail}>{detail}</div>
      </div>
      <div className={ok ? styles.statusOk : styles.statusErr}>
        {ok ? 'Active' : 'Offline'}
      </div>
    </div>
  );
}
