'use client';

import Link from 'next/link';
import { Clock, Users, Code, Image as ImageIcon, FileText, ChevronRight, Zap } from 'lucide-react';
import type { BountyData } from '@/lib/api';
import styles from './BountyCard.module.css';

interface Props {
  bounty: BountyData;
}

function timeLeft(deadline?: string): string {
  if (!deadline) return 'No deadline';
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}

function getAssetIcon(type?: string) {
  switch (type) {
    case 'media': return <ImageIcon size={20} />;
    case 'document': return <FileText size={20} />;
    default: return <Code size={20} />;
  }
}

export default function BountyCard({ bounty }: Props) {
  return (
    <Link href={`/bounties/${bounty.id}`} className={styles.card}>
      <div className={styles.topRow}>
        <div className={styles.categoryIcon}>
          {getAssetIcon(bounty.asset_type)}
        </div>
        <div className={styles.difficultyBadge}>
          {bounty.difficulty}
        </div>
      </div>

      <h3 className={styles.title}>{bounty.title}</h3>

      <p className={styles.desc}>
        {bounty.description.length > 100
          ? bounty.description.slice(0, 100) + '...'
          : bounty.description}
      </p>

      <div className={styles.meta}>
        <div className={styles.metaItem}>
          <Clock size={14} />
          <span>{timeLeft(bounty.deadline)}</span>
        </div>
        <div className={styles.metaItem}>
          <Users size={14} />
          <span>{bounty.submission_count} Applicants</span>
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.reward}>
          <span className={styles.rewardVal}>{bounty.reward_algo}</span>
          <span className={styles.rewardUnit}>ALGO</span>
        </div>
        
        {bounty.status === 'active' ? (
          <div className={styles.statusIndicator}>
            <div className={styles.statusDot} />
            Accepted
          </div>
        ) : (
          <span className={`badge badge-${bounty.status}`}>{bounty.status}</span>
        )}
      </div>
    </Link>
  );
}
