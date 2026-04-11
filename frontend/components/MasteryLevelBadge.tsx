'use client';

import { Award, Shield, Zap, Target, Star } from 'lucide-react';

interface MasteryBadgeProps {
  category: string;
  level: number;
}

export default function MasteryLevelBadge({ category, level }: MasteryBadgeProps) {
  // Determine badge style based on level/category
  const isElite = level >= 10;
  const isMaster = level >= 5;
  
  const getIcon = () => {
    switch (category.toLowerCase()) {
      case 'python': return <Zap size={14} />;
      case 'rust': return <Shield size={14} />;
      case 'design': return <Target size={14} />;
      default: return <Star size={14} />;
    }
  };

  const getTier = () => {
    if (isElite) return 'Elite';
    if (isMaster) return 'Master';
    return 'Professional';
  };

  return (
    <div className={`badge ${isElite ? 'badge-active' : isMaster ? 'badge-settled' : 'badge-pending'}`} 
         style={{ 
           display: 'inline-flex', 
           alignItems: 'center', 
           gap: '6px', 
           padding: '4px 10px', 
           borderRadius: '4px',
           fontSize: '0.7rem',
           fontWeight: 700,
           letterSpacing: '0.02em',
           textTransform: 'uppercase',
           border: isElite ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
           background: isElite ? 'rgba(0, 208, 255, 0.1)' : 'var(--bg-tertiary)'
         }}>
      {getIcon()}
      <span>{getTier()} {category}</span>
    </div>
  );
}
