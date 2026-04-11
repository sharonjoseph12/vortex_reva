'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { getGovernanceEarnings } from '@/lib/api';
import { 
  TrendingUp, ShieldAlert, Award, 
  History, ArrowUpRight, ArrowDownRight,
  Gavel, Info
} from 'lucide-react';
import styles from './page.module.css';

interface GovernanceEarnings {
  total_rewarded: number;
  total_slashed: number;
  net_delta: number;
  total_cases: number;
  success_rate: number;
  history: Array<{
    bounty_id: string;
    amount: number;
    type: string;
    date: string;
  }>;
}

export default function EarningsPage() {
  const { wallet } = useAuthStore();
  const [data, setData] = useState<GovernanceEarnings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!wallet) return;
    async function load() {
      try {
        const res = await getGovernanceEarnings();
        if (res.success) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Failed to load earnings', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [wallet]);

  if (loading) return <div className="page-container"><div className="loading-pulse">Aggregating Governance ROI...</div></div>;
  if (!data) return <div className="page-container">No governance data found for this partner.</div>;

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: 'var(--space-2xl)' }}>
        <h1 className="page-title">Arbiter Treasury</h1>
        <p className="page-subtitle">Governance Performance & Financial Realization</p>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}><Award size={20} color="var(--accent-primary)" /></div>
          <div>
            <span className={styles.statLabel}>Net Governance Delta</span>
            <div className={styles.statValue} style={{ color: data.net_delta >= 0 ? 'var(--accent-primary)' : 'var(--accent-danger)' }}>
              {data.net_delta.toFixed(2)} <span style={{ fontSize: '0.8rem' }}>ALGO</span>
            </div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}><Gavel size={20} color="var(--accent-secondary)" /></div>
          <div>
            <span className={styles.statLabel}>Cases Adjudicated</span>
            <div className={styles.statValue}>{data.total_cases}</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}><TrendingUp size={20} color="var(--accent-info)" /></div>
          <div>
            <span className={styles.statLabel}>Success Quorum Rate</span>
            <div className={styles.statValue}>{data.success_rate.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        {/* Ledger */}
        <div className="section">
          <h3 className="section-title"><History size={18} /> Governance Ledger</h3>
          <div className={styles.historyList}>
            {data.history.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
                No historical events recorded.
              </div>
            ) : (
              data.history.map((h, i) => (
                <div key={i} className={styles.historyItem}>
                  <div className={h.amount > 0 ? styles.positiveIcon : styles.negativeIcon}>
                    {h.amount > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                      {h.type === 'reward' ? 'Governance Payout' : 'Arbiter Slash'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Case #{h.bounty_id?.slice(0, 8)}</div>
                  </div>
                  <div style={{ fontWeight: 800, color: h.amount > 0 ? 'var(--accent-primary)' : 'var(--accent-danger)' }}>
                    {h.amount > 0 ? '+' : ''}{h.amount.toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Protection / Alpha */}
        <div className="section">
          <h3 className="section-title"><ShieldAlert size={18} /> Consensus Risk Analysis</h3>
          <div className="card" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--accent-warning)' }}>
            <h4 style={{ margin: '0 0 10px 0', color: 'var(--accent-warning)' }}>Elite Protection Reminder</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Your current quorum prediction rate is <strong>{data.success_rate.toFixed(1)}%</strong>. 
              Falling below 80% results in temporary suspension of Arbiter privileges to maintain Protocol integrity.
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <Info size={16} color="var(--accent-secondary)" />
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', fontWeight: 700 }}>
                Learn how to better evaluate Multi-Modal evidence in the Partner Handbook.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
