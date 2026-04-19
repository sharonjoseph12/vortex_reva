'use client';

import { useState, useEffect, useRef } from 'react';
import { getSubmission } from '@/lib/api';
import { Terminal, CheckCircle, XCircle, AlertTriangle, Loader } from 'lucide-react';
import styles from './VerificationTerminal.module.css';

interface Props {
  bountyId: string;
  submissionId: string;
  active: boolean;
  onSettled?: (data: Record<string, unknown>) => void;
}

interface PipelineStep {
  step: number;
  title: string;
  status: 'idle' | 'running' | 'pass' | 'fail' | 'na';
  message: string;
}

const STEP_TITLES = [
  'Static AST Analysis',
  'Sandbox Execution',
  'AI Advisory Jury',
  'Oracle Settlement',
];

function buildSteps(data: any): PipelineStep[] {
  const step = data.verification_step ?? 0;
  const status = data.status ?? 'processing';
  const failed = status === 'failed';
  const passed = status === 'passed';

  return STEP_TITLES.map((title, i) => {
    const n = i + 1; // 1-indexed

    let stepStatus: PipelineStep['status'] = 'idle';
    let message = 'Waiting...';

    if (passed) {
      stepStatus = 'pass';
      message = stepMessages(n, data, true);
    } else if (failed && step === n) {
      stepStatus = 'fail';
      message = data.last_error ?? 'Step failed';
    } else if (failed && step > n) {
      stepStatus = 'pass';
      message = stepMessages(n, data, true);
    } else if (step > n) {
      stepStatus = 'pass';
      message = stepMessages(n, data, true);
    } else if (step === n) {
      stepStatus = 'running';
      message = 'Processing...';
    }

    return { step: n, title, status: stepStatus, message };
  });
}

function stepMessages(n: number, data: any, done: boolean): string {
  if (n === 1) return data.static_passed === false ? 'Security violation detected' : 'Syntax & security audit passed';
  if (n === 2) return data.sandbox_passed === false ? 'Tests failed' : 'Execution complete';
  if (n === 3) return data.jury_passed === false ? 'AI Jury rejected' : 'Advisory consensus reached';
  if (n === 4) return data.tx_id ? `TX: ${data.tx_id.slice(0, 12)}...` : 'Oracle consensus achieved';
  return done ? 'Complete' : 'Processing...';
}

export default function VerificationTerminal({ bountyId, submissionId, active, onSettled }: Props) {
  const [steps, setSteps] = useState<PipelineStep[]>(
    STEP_TITLES.map((title, i) => ({ step: i + 1, title, status: 'idle', message: 'Waiting...' }))
  );
  const [logs, setLogs] = useState<string[]>([
    '> VORTEX Protocol v1.0 initialized',
    '> Pipeline starting...',
  ]);
  const [settled, setSettled] = useState(false);
  const logsRef = useRef<HTMLDivElement>(null);
  const settledRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active || !submissionId) return;

    settledRef.current = false;
    setSettled(false);
    setLogs(['> VORTEX Protocol v1.0 initialized', '> Pipeline starting...']);
    setSteps(STEP_TITLES.map((title, i) => ({ step: i + 1, title, status: 'idle', message: 'Waiting...' })));

    let prevStep = 0;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let channelRef: any = null;

    async function poll() {
      if (settledRef.current) return;
      try {
        const res = await getSubmission(submissionId);
        const data = res.data as any;
        const newSteps = buildSteps(data);
        setSteps(newSteps);

        if (data.verification_step > prevStep) {
          const stepLabels: Record<number, string> = {
            1: '> Static AST Analysis running...',
            2: '> Sandbox Execution running...',
            3: '> AI Advisory Jury deliberating...',
            4: '> Oracle consensus voting...',
          };
          const line = stepLabels[data.verification_step];
          if (line) setLogs(prev => [...prev, line]);
          prevStep = data.verification_step;
        }

        const done = data.status === 'passed' || data.status === 'failed';
        if (done && !settledRef.current) {
          settledRef.current = true;
          setSettled(true);

          // Stop polling
          if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }

          const resultLine = data.status === 'passed'
            ? `> ✓ Settlement confirmed — ${data.settlement_time?.toFixed(1) ?? '?'}s`
            : `> ✗ Pipeline failed: ${data.last_error ?? 'Unknown error'}`;
          setLogs(prev => [...prev, resultLine]);

          if (data.status === 'passed' && onSettled) {
            onSettled({
              tests_passed: 0,
              settlement_time: data.settlement_time,
              nft_id: data.nft_id,
              tx_id: data.tx_id,
              reward: undefined,
            });
          }
        }
      } catch {
        // ignore
      }
    }

    // Immediate first poll + interval fallback every 2s
    poll();
    pollTimer = setInterval(poll, 2000);

    // WebSocket as optional accelerator (triggers extra poll on broadcast)
    import('@/lib/supabase').then(({ supabase }) => {
      const channel = supabase.channel(`verification_${bountyId}`)
        .on('broadcast', { event: '*' }, () => { poll(); })
        .subscribe();
      channelRef = channel;
    }).catch(() => { /* WebSocket unavailable — polling handles it */ });

    return () => {
      if (pollTimer) clearInterval(pollTimer);
      import('@/lib/supabase').then(({ supabase }) => {
        if (channelRef) supabase.removeChannel(channelRef);
      }).catch(() => {});
    };
  }, [active, submissionId, bountyId]);

  // Auto-scroll
  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight;
  }, [logs]);

  function icon(s: PipelineStep['status']) {
    if (s === 'running') return <Loader size={14} className={styles.spinning} />;
    if (s === 'pass') return <CheckCircle size={14} />;
    if (s === 'fail') return <XCircle size={14} />;
    if (s === 'na') return <AlertTriangle size={14} />;
    return <span className={styles.stepDot} />;
  }

  function lineClass(line: string) {
    if (line.includes('✓') || line.includes('PASS') || line.includes('SAFE')) return styles.logSuccess;
    if (line.includes('✗') || line.includes('FAIL') || line.includes('ERROR')) return styles.logError;
    if (line.includes('⚠') || line.includes('WARNING')) return styles.logWarning;
    if (line.includes('Oracle') || line.includes('consensus')) return styles.logInfo;
    return '';
  }

  return (
    <div className={styles.container}>
      <div className={styles.pipeline}>
        {steps.map(s => (
          <div key={s.step} className={`${styles.step} ${styles[s.status]}`}>
            <div className={styles.stepNum}>{icon(s.status)}</div>
            <div className={styles.stepInfo}>
              <div className={styles.stepTitle}>{s.title}</div>
              <div className={styles.stepMsg}>{s.message}</div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.terminal}>
        <div className={styles.termHeader}>
          <Terminal size={12} />
          <span>verification output</span>
          {settled && <span className={styles.settledBadge}>SETTLED</span>}
        </div>
        <div className={styles.termBody} ref={logsRef}>
          {logs.map((line, i) => (
            <div key={i} className={`${styles.termLine} ${lineClass(line)}`}>{line}</div>
          ))}
          {!settled && active && (
            <div className={styles.termLine}><span className={styles.cursor}>▌</span></div>
          )}
        </div>
      </div>
    </div>
  );
}
