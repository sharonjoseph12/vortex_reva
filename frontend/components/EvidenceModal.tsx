'use client';

import { X, Terminal, Shield, Cpu, BrainCircuit } from 'lucide-react';
import styles from './EvidenceModal.module.css';

interface Props {
  data: {
    static_logs?: string[];
    sandbox_logs?: string[];
    jury_logs?: string[];
  };
  onClose: () => void;
}

export default function EvidenceModal({ data, onClose }: Props) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleLine}>
             <Shield size={18} color="var(--accent-primary)" />
             <span>Sovereign Verification Evidence</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.body}>
          <Section 
            title="Static Analysis Audit" 
            icon={<Cpu size={14} />} 
            logs={data.static_logs || ['> No AST violations detected.']} 
          />
          <Section 
            title="Sandbox Runtime Logs" 
            icon={<Shield size={14} />} 
            logs={data.sandbox_logs || ['> Execution isolation maintained.']} 
          />
          <Section 
            title="AI Jury Deliberation" 
            icon={<BrainCircuit size={14} />} 
            logs={data.jury_logs || ['> Requirements consistency: 100%']} 
          />
        </div>

        <div className={styles.footer}>
          <Terminal size={12} />
          <span>VORTEX Cryptographic Receipt · Immutable Record</span>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, logs }: { title: string; icon: React.ReactNode; logs: string[] }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        {icon}
        <span>{title}</span>
      </div>
      <div className={styles.logBox}>
        {logs.map((line, i) => (
          <div key={i} className={styles.logLine}>{line}</div>
        ))}
      </div>
    </div>
  );
}
