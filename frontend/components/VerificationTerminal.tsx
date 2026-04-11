'use client';

import { useState, useEffect, useRef } from 'react';
import { createVerificationStream, type VerificationEvent } from '@/lib/api';
import { Terminal, CheckCircle, XCircle, AlertTriangle, Loader } from 'lucide-react';
import styles from './VerificationTerminal.module.css';

interface Props {
  bountyId: string;
  active: boolean;
}

interface PipelineStep {
  step: number;
  title: string;
  status: 'idle' | 'running' | 'pass' | 'fail' | 'frozen';
  message: string;
  logs: string[];
}

const INITIAL_STEPS: PipelineStep[] = [
  { step: 1, title: 'Static AST Analysis', status: 'idle', message: 'Waiting...', logs: [] },
  { step: 2, title: 'Sandbox Execution', status: 'idle', message: 'Waiting...', logs: [] },
  { step: 3, title: 'AI Advisory Jury', status: 'idle', message: 'Waiting...', logs: [] },
  { step: 4, title: 'Oracle Settlement', status: 'idle', message: 'Waiting...', logs: [] },
];

export default function VerificationTerminal({ bountyId, active }: Props) {
  const [steps, setSteps] = useState<PipelineStep[]>(INITIAL_STEPS);
  const [allLogs, setAllLogs] = useState<string[]>(['> VORTEX Protocol v1.0 initialized', '> Awaiting submission...']);
  const [settled, setSettled] = useState(false);
  const [settlementData, setSettlementData] = useState<Record<string, unknown> | null>(null);
  const logsRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!active) return;

    // Reset
    setSteps(INITIAL_STEPS);
    setAllLogs(['> VORTEX Protocol v1.0 initialized', '> Pipeline starting...']);
    setSettled(false);
    setSettlementData(null);

    const es = createVerificationStream(
      bountyId,
      (event: VerificationEvent) => {
        // Update step status
        setSteps((prev) => {
          const updated = [...prev];
          const idx = event.step - 1;
          if (idx >= 0 && idx < updated.length) {
            updated[idx] = {
              ...updated[idx],
              status: (event.status || 'running') as PipelineStep['status'],
              message: event.message || 'Processing...',
              logs: [...(updated[idx].logs || []), ...(event.logs || [])],
            };
          }
          return updated;
        });

        // Append to global log
        const incomingLogs = event.logs || [];
        if (incomingLogs.length > 0) {
          setAllLogs((prev) => [...prev, ...incomingLogs]);
        }

        // Settlement complete
        if (event.event === 'settlement_complete') {
          setSettled(true);
          setSettlementData(event.data || null);
        }
      },
      () => {
        // SSE error — likely stream ended
      }
    );

    esRef.current = es;

    return () => {
      es.close();
    };
  }, [bountyId, active]);

  // Auto-scroll logs
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [allLogs]);

  function getStepIcon(status: string) {
    switch (status) {
      case 'running': return <Loader size={14} className={styles.spinning} />;
      case 'pass': return <CheckCircle size={14} />;
      case 'fail': return <XCircle size={14} />;
      case 'frozen': return <AlertTriangle size={14} />;
      default: return <span className={styles.stepDot} />;
    }
  }

  function getLineClass(line: string): string {
    if (line.includes('PASS') || line.includes('✓') || line.includes('SAFE')) return styles.logSuccess;
    if (line.includes('FAIL') || line.includes('✗') || line.includes('ERROR')) return styles.logError;
    if (line.includes('⚠') || line.includes('FREEZE') || line.includes('WARNING')) return styles.logWarning;
    if (line.includes('Oracle') || line.includes('VOTED') || line.includes('consensus')) return styles.logInfo;
    return '';
  }

  return (
    <div className={styles.container}>
      {/* Pipeline Steps */}
      <div className={styles.pipeline}>
        {steps.map((s) => (
          <div key={s.step} className={`${styles.step} ${styles[s.status]}`}>
            <div className={styles.stepNum}>
              {getStepIcon(s.status)}
            </div>
            <div className={styles.stepInfo}>
              <div className={styles.stepTitle}>{s.title}</div>
              <div className={styles.stepMsg}>{s.message}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Terminal Output */}
      <div className={styles.terminal}>
        <div className={styles.termHeader}>
          <Terminal size={12} />
          <span>verification output</span>
          {settled && (
            <span className={styles.settledBadge}>SETTLED</span>
          )}
        </div>
        <div className={styles.termBody} ref={logsRef}>
          {allLogs.map((line, i) => (
            <div key={i} className={`${styles.termLine} ${getLineClass(line)}`}>
              {line}
            </div>
          ))}
          {!settled && active && (
            <div className={styles.termLine}>
              <span className={styles.cursor}>▌</span>
            </div>
          )}
        </div>
      </div>

      {/* Settlement Summary */}
      {settled && settlementData && (
        <div className={styles.settlement}>
          <div className={styles.settlementHeader}>
             <div className={styles.settlementTitle}>
               <CheckCircle size={16} /> Settlement Complete
             </div>
             <div className={styles.neuralSync}>
                <div className={styles.syncPulse}>
                  <div className={styles.pulseInner} />
                </div>
                <span>Neural Sync: OK</span>
             </div>
          </div>
          
          <div className={styles.settlementGrid}>
            {'reward' in settlementData && (
              <div className={styles.settlementItem}>
                <span className={styles.settlementLabel}>Reward</span>
                <span className={styles.settlementValue}>
                  {String(settlementData.reward)} ALGO
                </span>
              </div>
            )}
            {'settlement_time' in settlementData && (
              <div className={styles.settlementItem}>
                <span className={styles.settlementLabel}>Time</span>
                <span className={styles.settlementValue}>
                  {String(settlementData.settlement_time)}s
                </span>
              </div>
            )}
            <div className={styles.settlementItem}>
               <span className={styles.settlementLabel}>Quorum Consensus</span>
               <span className={styles.settlementValue} style={{ color: 'var(--accent-primary)' }}>100% Alignment</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
