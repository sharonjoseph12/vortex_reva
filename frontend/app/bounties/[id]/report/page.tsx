'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getBounty, type BountyData } from '@/lib/api';
import { 
  ShieldCheck, FileText, Cpu, Eye, 
  Terminal, CheckCircle, Scale, Clock, 
  ExternalLink, ArrowLeft, Download, ShieldAlert
} from 'lucide-react';
import styles from './page.module.css';

interface AuditData {
  submission_id: string;
  bounty: { title: string; category: string; reward: number };
  verification_stack: {
    static: { passed: boolean; logs: any };
    sandbox: { passed: boolean; logs: any };
    jury: { passed: boolean; logs: any };
  };
  performance: { settlement_seconds: number; timestamp: string };
  tx_id: string;
  status: string;
}

export default function AuditReportPage() {
  const { id } = useParams();
  const router = useRouter();
  const [report, setReport] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAudit() {
      try {
        // Fetching from simulated audit endpoint
        const res = await fetch(`http://localhost:8000/submissions/latest/audit`);
        const data = await res.json();
        setReport(data.data);
      } catch (e) {
        console.error('Audit retrieval failed', e);
      } finally {
        setLoading(false);
      }
    }
    loadAudit();
  }, [id]);

  if (loading) return <div className="page-container"><div className="loading-pulse">Retrieving forensic traces...</div></div>;
  if (!report) return <div className="page-container">Audit data not found for this settlement.</div>;

  return (
    <div className="page-container">
      <div className={styles.header}>
        <button className="btn btn-ghost btn-sm" onClick={() => router.back()}>
          <ArrowLeft size={14} /> Back to Bounty
        </button>
        <button className="btn btn-primary btn-sm">
          <Download size={14} /> Export Immutable Certificate
        </button>
      </div>

      <div className={styles.certificate}>
        <div className={styles.seal}>
          <ShieldCheck size={64} color="var(--accent-primary)" />
        </div>
        
        <div className={styles.certBody}>
          <div className={styles.certHeader}>
            <div className={styles.brand}>VORTEX PROTOCOL</div>
            <h1 className={styles.title}>Verification Certificate</h1>
            <div className={styles.serial}>Case Identifier: {report.submission_id.toUpperCase()}</div>
          </div>

          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Project Title</span>
              <span className={styles.metaValue}>{report.bounty.title}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Category</span>
              <span className={styles.metaValue} style={{ textTransform: 'uppercase' }}>{report.bounty.category}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Timestamp</span>
              <span className={styles.metaValue}>{new Date(report.performance.timestamp).toLocaleString()}</span>
            </div>
          </div>

          {/* Verification Trace Sections */}
          <div className={styles.traceGrid}>
            <TraceSection 
              icon={<Cpu size={24} />}
              title="Static Intelligence (AST)"
              passed={report.verification_stack.static.passed}
              logs={report.verification_stack.static.logs}
            />
            <TraceSection 
              icon={<Terminal size={24} />}
              title="Deterministic Sandbox"
              passed={report.verification_stack.sandbox.passed}
              logs={report.verification_stack.sandbox.logs}
            />
            <TraceSection 
              icon={<Scale size={24} />}
              title="Multi-Modal AI Jury"
              passed={report.verification_stack.jury.passed}
              logs={report.verification_stack.jury.logs}
            />
          </div>

          <div className={styles.footer}>
            <div className={styles.footItem}>
              <Clock size={16} />
              <span>Settlement Accuracy: <strong>{report.performance.settlement_seconds.toFixed(2)}s</strong></span>
            </div>
            <div className={styles.footItem}>
              <ExternalLink size={16} />
              <span>On-Chain Tx: <strong>{report.tx_id?.slice(0, 16)}...</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TraceSection({ icon, title, passed, logs }: { icon: any, title: string, passed: boolean, logs: any }) {
  return (
    <div className={styles.traceSection}>
      <div className={styles.traceHeader}>
        <div className={styles.traceIcon}>{icon}</div>
        <div className={styles.traceTitle}>{title}</div>
        <div className={passed ? styles.statusOk : styles.statusErr}>
          {passed ? <CheckCircle size={14} /> : <ShieldAlert size={14} />}
          {passed ? 'Verified' : 'Flagged'}
        </div>
      </div>
      <div className={styles.traceLogs}>
        {typeof logs === 'string' ? logs : JSON.stringify(logs, null, 2)}
      </div>
    </div>
  );
}
