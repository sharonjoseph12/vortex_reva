'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getAchievements, type MasteryNFT } from '@/lib/api';
import { Award, ShieldCheck, ExternalLink, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import styles from './page.module.css';

export default function AchievementsPage() {
  const { wallet } = useParams();
  const [achievements, setAchievements] = useState<MasteryNFT[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (wallet) {
      load();
    }
  }, [wallet]);

  async function load() {
    try {
      const res = await getAchievements(wallet as string);
      setAchievements(res.data.achievements);
    } catch (e) {
      console.error("Failed to load achievements", e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <Loader2 className="animate-spin" size={32} color="var(--accent-primary)" />
          <p style={{ marginTop: '16px', color: 'var(--text-tertiary)' }}>Syncing On-Chain Credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className={styles.container}>
        <header className={styles.header}>
          <Link href={`/profiles/${wallet}`} className="btn btn-ghost btn-sm" style={{ marginBottom: '24px', paddingLeft: 0 }}>
            <ArrowLeft size={14} /> Back to Profile
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '12px', background: 'var(--accent-primary-dim)', borderRadius: '16px', color: 'var(--accent-primary)' }}>
              <Award size={32} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.03em' }}>On-Chain Mastery</h1>
              <p style={{ margin: '4px 0 0', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
                Verifiable credentials issued by the VORTEX Oracle Consortium.
              </p>
            </div>
          </div>
        </header>

        {achievements.length === 0 ? (
          <div className={styles.empty}>
            <Sparkles size={48} color="var(--accent-primary)" style={{ opacity: 0.3, marginBottom: '20px' }} />
            <h3>No Credentials Issued</h3>
            <p style={{ color: 'var(--text-tertiary)', maxWidth: '400px', margin: '8px auto' }}>
              Complete high-stakes missions to earn unique on-chain Mastery NFTs and build your reputation.
            </p>
            <Link href="/bounties" className="btn btn-primary" style={{ marginTop: '24px' }}>
              Explore Marketplace
            </Link>
          </div>
        ) : (
          <div className={styles.gallery}>
            {achievements.map((nft) => (
              <div key={nft.id} className={styles.nftCard}>
                <div className={styles.imageContainer}>
                  <div className={styles.glow} />
                  <img src={nft.image} alt={nft.name} />
                  <div style={{ position: 'absolute', bottom: '12px', left: '12px', zindex: 2 }}>
                    <span className="badge badge-active" style={{ fontSize: '0.6rem', padding: '4px 10px' }}>
                       <ShieldCheck size={10} style={{ marginRight: '4px' }} /> Verified Mastery
                    </span>
                  </div>
                </div>
                
                <div className={styles.nftInfo}>
                  <h3 className={styles.nftName}>{nft.name}</h3>
                  <span className={styles.bountyTitle}>Mission: {nft.bounty_title}</span>
                  
                  <div className={styles.footer}>
                    <div className={styles.date}>
                      {new Date(nft.minted_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    </div>
                    <a 
                      href={nft.asset_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={styles.verifyBtn}
                    >
                      <ExternalLink size={12} /> Registry
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
