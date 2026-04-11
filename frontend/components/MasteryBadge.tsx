'use client';

import { Award, Shield, Fingerprint, Calendar, ExternalLink } from 'lucide-react';
import styles from './MasteryBadge.module.css';

interface MasteryBadgeProps {
  id: string;
  name: string;
  bounty: string;
  date: string;
  assetUrl: string;
}

export default function MasteryBadge({ id, name, bounty, date, assetUrl }: MasteryBadgeProps) {
  return (
    <div className="card" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'var(--accent-primary)' }} />
      
      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ width: '80px', height: '80px', background: 'rgba(0,208,255,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Award size={40} color="var(--accent-primary)" />
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{name}</h3>
            <span className="badge badge-active" style={{ fontSize: '0.65rem' }}>Verified Mastery</span>
          </div>
          <p style={{ margin: '4px 0 12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Earned for: <strong>{bounty}</strong>
          </p>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={12} /> {new Date(date).toLocaleDateString()}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Fingerprint size={12} /> ID: {id.slice(0, 8)}...
            </span>
          </div>
        </div>
      </div>
      
      <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
        <a href={assetUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-xs">
          View on Ledger <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}
