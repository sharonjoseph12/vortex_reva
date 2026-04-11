'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { getTransactions, type TransactionData } from '@/lib/api';
import { ArrowLeftRight, ExternalLink, Filter, ShieldCheck, Download } from 'lucide-react';
import styles from './page.module.css';

const TYPE_LABELS: Record<string, string> = {
  lock: 'Escrow Lock',
  payout: 'Final Settlement',
  refund: 'Contract Refund',
  stake: 'Trust Stake',
  freeze: 'Gov Freeze',
  reward: 'Protocol Reward',
};

export default function TransactionsPage() {
  const { wallet } = useAuthStore();
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    if (!wallet) return;
    load();
  }, [wallet, typeFilter]);

  async function load() {
    if (!wallet) return;
    setLoading(true);
    try {
      const res = await getTransactions(wallet, {
        type: typeFilter || undefined,
        limit: 50,
      });
      setTransactions(res.data.transactions);
      setTotal(res.data.total);
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: 'var(--space-2xl)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <ArrowLeftRight size={24} color="var(--accent-primary)" />
            </div>
            <div>
              <h1 className="page-title" style={{ margin: 0 }}>Financial Ledger</h1>
              <p className="page-subtitle">Immutable on-chain audit trail for {wallet?.slice(0, 8)}...</p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Modern Filter Section */}
      <div className={styles.filterBar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} style={{ color: 'var(--text-tertiary)' }} />
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Log Filter:</span>
        </div>
        <select
          className="select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{ width: '200px' }}
        >
          <option value="">All Transactions</option>
          <option value="lock">Escrow Locks</option>
          <option value="payout">Settlements</option>
          <option value="refund">Refunds</option>
          <option value="stake">Protocol Stakes</option>
        </select>
      </div>

      {/* Premium Ledger Table */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '100px 0' }}>
          <div className="loading-pulse">Decrypting ledger...</div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '100px 0' }}>
           <ShieldCheck size={48} style={{ color: 'var(--border-color)', marginBottom: '20px' }} />
          <h3 className="page-title">No matching records</h3>
          <p className="page-subtitle">Historical settlements will appear here after verification.</p>
        </div>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>Event Type</span>
            <span>Volume</span>
            <span>Transaction Hash</span>
            <span>Status</span>
            <span style={{ textAlign: 'right' }}>Timestamp</span>
          </div>
          {transactions.map((tx) => (
            <div key={tx.id} className={styles.tableRow}>
              <div className={styles.colType}>
                <span className={`badge badge-${tx.type === 'payout' || tx.type === 'reward' ? 'active' : tx.type === 'refund' ? 'pending' : tx.type === 'freeze' ? 'frozen' : 'settled'}`}>
                  {TYPE_LABELS[tx.type] || tx.type.toUpperCase()}
                </span>
              </div>
              
              <div className={styles.colAmount}>
                <span className={styles.amount}>{tx.amount_algo.toFixed(2)}</span>
                <span className={styles.unit}>ALGO</span>
              </div>

              <div className={styles.colHash}>
                <span className={styles.hash}>{tx.tx_hash.slice(0, 16)}</span>
                <a
                  href={`https://testnet.explorer.perawallet.app/tx/${tx.tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.explorerLink}
                  title="View on Pera Explorer"
                >
                  <ExternalLink size={14} />
                </a>
              </div>

              <div className={styles.colStatus}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: tx.status === 'confirmed' ? 'var(--accent-primary)' : 'var(--accent-danger)' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: tx.status === 'confirmed' ? 'var(--accent-primary)' : 'var(--accent-danger)' }}>
                    {tx.status}
                  </span>
                </div>
              </div>

              <div className={styles.colDate}>
                {tx.created_at ? new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
