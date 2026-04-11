'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getAchievements, type MasteryNFT } from '@/lib/api';
import { 
  Award, Shield, Fingerprint, 
  ArrowLeft, Search, Filter
} from 'lucide-react';
import MasteryBadge from '@/components/MasteryBadge';
import Link from 'next/link';
import styles from './page.module.css';

export default function AchievementsPage() {
  const { wallet } = useParams();
  const [achievements, setAchievements] = useState<MasteryNFT[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (wallet) load();
  }, [wallet]);

  async function load() {
    try {
      const res = await getAchievements(wallet as string);
      setAchievements(res.data.achievements);
    } catch {
      // demo fallback
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container">
      <Link href={`/profiles/${wallet}`} className="btn btn-ghost btn-sm" style={{ marginBottom: '20px' }}>
        <ArrowLeft size={14} /> Back to Profile
      </Link>

      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <div className="badge badge-active" style={{ marginBottom: '12px' }}>
            <Fingerprint size={12} fill="currentColor" /> Immutable Reputation
          </div>
          <h1 className={styles.title}>Sovereign Achievement Gallery</h1>
          <p className={styles.subtitle}>
            Verified on-chain professional mastery tokens (ASAs) earned through 
            the VORTEX forensic verification protocol.
          </p>
        </div>
        <div className={styles.headerStats}>
          <div className={styles.hCard}>
            <span className={styles.hLabel}>Mastery Level</span>
            <span className={styles.hVal}>Level {Math.max(1, Math.floor(achievements.length / 2))}</span>
          </div>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <Search size={14} />
          <input type="text" placeholder="Search achievements..." className={styles.searchInput} />
        </div>
        <button className="btn btn-secondary btn-sm">
          <Filter size={14} /> Filter
        </button>
      </div>

      <div className={styles.grid}>
        {achievements.map((item) => (
          <MasteryBadge 
            key={item.id}
            id={item.id}
            name={item.name}
            bounty={item.bounty_title}
            date={item.minted_at}
            assetUrl={item.asset_url}
          />
        ))}
        {achievements.length === 0 && !loading && (
          <div className={styles.empty}>
            <Award size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
            <p>No on-chain mastery tokens found for this partner yet.</p>
          </div>
        )}
      </div>

      <div className={styles.disclaimer}>
        <Shield size={16} color="var(--accent-primary)" style={{ opacity: 0.5 }} />
        <p>
          All achievements displayed here are cryptographically bound to the Algorand blockchain 
          and cross-referenced with the Protocol Forensic Trace for total verifiability.
        </p>
      </div>
    </div>
  );
}
