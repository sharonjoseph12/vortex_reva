'use client';

import { 
  CheckCircle, Circle, Play, Shield, Gavel, Cpu, XCircle 
} from 'lucide-react';
import ExplorerLink from './ExplorerLink';

interface Stage {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  data?: any;
  txId?: string;
}

interface ForensicTimelineProps {
  stages: Stage[];
}

export default function ForensicTimeline({ stages }: ForensicTimelineProps) {
  return (
    <div className="card" style={{ padding: '24px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
      <h3 style={{ fontSize: '0.875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Shield size={16} color="var(--accent-primary)" /> Forensic Verification Timeline
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {stages.map((stage, idx) => {
          const isActive = stage.status === 'running';
          const isDone = stage.status === 'passed';
          const isFailed = stage.status === 'failed';
          
          return (
            <div key={stage.id} style={{ display: 'flex', gap: '16px', position: 'relative' }}>
              {/* Connector Line */}
              {idx < stages.length - 1 && (
                <div style={{ 
                  position: 'absolute', 
                  left: '11px', 
                  top: '24px', 
                  bottom: '-24px', 
                  width: '2px', 
                  background: isDone ? 'var(--accent-primary)' : 'var(--border-color)',
                  opacity: isDone ? 1 : 0.3,
                  zIndex: 0
                }} />
              )}

              {/* Icon / Indicator */}
              <div style={{ zIndex: 1, position: 'relative', marginTop: '4px' }}>
                {isDone ? (
                  <CheckCircle size={24} color="var(--accent-primary)" fill="rgba(0, 208, 255, 0.1)" />
                ) : isActive ? (
                  <div className="pulse-ring" style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Play size={12} color="black" />
                  </div>
                ) : isFailed ? (
                  <XCircle size={24} color="var(--accent-danger)" />
                ) : (
                  <Circle size={24} color="var(--text-tertiary)" />
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, paddingBottom: idx === stages.length - 1 ? 0 : '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: isDone ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {stage.name}
                  </h4>
                  {isDone && stage.txId && (
                    <ExplorerLink type="transaction" id={stage.txId} label="Proof" className="text-xs" />
                  )}
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                  {stage.description}
                </p>
                
                {stage.data && (
                  <div style={{ 
                    marginTop: '12px', 
                    padding: '12px', 
                    background: 'rgba(0,0,0,0.2)', 
                    borderRadius: '4px', 
                    fontFamily: 'var(--font-mono)', 
                    fontSize: '0.7rem',
                    borderLeft: `2px solid ${isDone ? 'var(--accent-primary)' : 'var(--border-color)'}`
                  }}>
                    {typeof stage.data === 'string' ? stage.data : JSON.stringify(stage.data, null, 2)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
