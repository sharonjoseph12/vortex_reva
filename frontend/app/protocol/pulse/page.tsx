'use client';

import React, { useState, useEffect } from 'react';
import { 
  getProtocolMetrics, getTreasuryStats, getArbiterPulse, 
  getHistoricalVolume 
} from '@/lib/api';
import { 
  Activity, Shield, Zap, TrendingUp, Users, 
  Clock, Server, Globe, ArrowDownRight, RefreshCw
} from 'lucide-react';
import PulseChart from '@/components/PulseChart';
import styles from './page.module.css';

export default function GlobalPulsePage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [treasury, setTreasury] = useState<any>(null);
  const [arbiters, setArbiters] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState(new Date());

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // 30s refresh
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [m, t, a, h] = await Promise.all([
        getProtocolMetrics(),
        getTreasuryStats(),
        getArbiterPulse(),
        getHistoricalVolume()
      ]);
      setMetrics(m.data);
      setTreasury(t.data);
      setArbiters(a.data);
      setHistory(h.data.history);
      setLastSync(new Date());
    } catch (e) {
      console.error("Pulse sync failure", e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="page-container">Initializing Sovereign Pulse...</div>;

  return (
    <div className="page-container">
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <div className={styles.liveIndicator}>
            <div className={styles.pulseDot} />
            LIVE PROTOCOL TELEMETRY
          </div>
          <h1 className={styles.title}>VORTEX Global Pulse</h1>
          <p className={styles.subtitle}>
            Real-time observability of settlement velocity, economic finality, 
            and consensus health across the decentralized network.
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => loadData()}>
          <RefreshCw size={14} className={loading ? styles.spinning : ''} /> 
          Sync: {lastSync.toLocaleTimeString()}
        </button>
      </div>

      <div className={styles.mainGrid}>
        {/* Real-time stats */}
        <div className={styles.statsPanel}>
          <div className={styles.statCard}>
            <div className={styles.sHeader}>
              <TrendingUp size={16} color="var(--accent-primary)" />
              <span>Total Economic Finality</span>
            </div>
            <div className={styles.sVal}>{metrics?.total_finality_algo?.toLocaleString()} ALGO</div>
            <div className={styles.sSubtitle}>Settled on Algorand TestNet</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.sHeader}>
              <Clock size={16} color="var(--accent-primary)" />
              <span>Settlement Velocity</span>
            </div>
            <div className={styles.sVal}>{metrics?.consensus_velocity_hours}h</div>
            <div className={styles.sSubtitle}>Avg. Time-to-Finality (TTF)</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.sHeader}>
              <Users size={16} color="var(--accent-primary)" />
              <span>Network Participation</span>
            </div>
            <div className={styles.sVal}>{metrics?.participation_rate}%</div>
            <div className={styles.sSubtitle}>{metrics?.active_arbiters} Active Sovereign Arbiters</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.sHeader}>
              <Activity size={16} color="var(--accent-primary)" />
              <span>Protocol Health</span>
            </div>
            <div className={styles.sVal}>{metrics?.health_score}%</div>
            <div className={styles.sSubtitle}>Operational Integrity Score</div>
          </div>
        </div>

        {/* Charts Section */}
        <div className={styles.chartsPanel}>
          <div className={styles.chartBox}>
            <PulseChart 
              label="Mission Volume (Last 10 Days)"
              data={history.map(h => ({ date: h.date, value: h.volume }))}
              height={140}
            />
          </div>
          <div className={styles.chartBox}>
            <PulseChart 
              label="Adjudication Efficiency"
              data={history.map(h => ({ date: h.date, value: h.finality }))}
              height={140}
              color="#00d0ff"
            />
          </div>
        </div>

        {/* Treasury & Consensus */}
        <div className={styles.detailsPanel}>
          <section className={styles.detailSection}>
            <h3 className={styles.sectionTitle}><Shield size={18} /> Treasury Reserve</h3>
            <div className={styles.treasuryInfo}>
              <div className={styles.tRow}>
                <span>Protocol Fees (2%)</span>
                <span>{treasury?.protocol_fees_accrued?.toLocaleString()} ALGO</span>
              </div>
              <div className={styles.tRow}>
                <span>Arbiter Rewards</span>
                <span>{treasury?.arbitration_rewards_distributed?.toLocaleString()} ALGO</span>
              </div>
              <div className={styles.tRow} style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', color: 'var(--accent-primary)' }}>
                <span>Net Protocol Reserve</span>
                <span>{treasury?.net_protocol_reserve?.toLocaleString()} ALGO</span>
              </div>
            </div>
          </section>

          <section className={styles.detailSection}>
            <h3 className={styles.sectionTitle}><Globe size={18} /> Arbiter Pulse</h3>
            <div className={styles.arbiterList}>
              {(arbiters?.arbiter_pulse || []).slice(0, 5).map((a: any) => (
                <div key={a.wallet} className={styles.aRow}>
                  <div className={styles.aInfo}>
                    <span className={styles.aAddr}>{a.wallet.slice(0, 10)}...</span>
                    <span className={styles.aStatus}>{a.status}</span>
                  </div>
                  <div className={styles.aStats}>
                    <span>{a.participation}% Align</span>
                    <div className={styles.miniBar}>
                      <div className={styles.barFill} style={{ width: `${a.participation}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
