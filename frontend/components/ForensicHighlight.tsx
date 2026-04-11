'use client';

import React from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import styles from './ForensicHighlight.module.css';

interface ForensicIssue {
  line: number;
  type: string;
  message: string;
  fix_hint?: string;
}

interface ForensicReport {
  summary: string;
  issues: ForensicIssue[];
}

interface ForensicHighlightProps {
  code: string;
  report: ForensicReport;
}

export default function ForensicHighlight({ code, report }: ForensicHighlightProps) {
  const lines = code.split('\n');
  const issueMap = new Map<number, ForensicIssue>();
  report.issues.forEach(iss => {
    if (iss.line) issueMap.set(iss.line, iss);
  });

  return (
    <div className={styles.terminalContainer}>
      <div className={styles.terminalHeader}>
        <div className={styles.dots}>
          <div className={styles.dot} style={{ background: '#FF5F56' }} />
          <div className={styles.dot} style={{ background: '#FFBD2E' }} />
          <div className={styles.dot} style={{ background: '#27C93F' }} />
        </div>
        <span>Forensic Audit & Mitigation Insight</span>
      </div>
      
      <div className={styles.summaryArea}>
        <div className={styles.summaryTitle}>
          <AlertCircle size={14} /> Protocol Breach Summary
        </div>
        <p className={styles.summaryText}>{report.summary}</p>
      </div>

      <div className={styles.codeArea}>
        {lines.map((ln, i) => {
          const lineNum = i + 1;
          const issue = issueMap.get(lineNum);
          
          return (
            <div key={i} className={`${styles.lineWrapper} ${issue ? styles.flaggedLine : ''}`}>
              <span className={styles.lineNum}>{lineNum}</span>
              <code className={styles.lineText}>{ln || ' '}</code>
              
              {issue && (
                <div className={styles.flagTooltip}>
                  <div className={styles.flagMain}>
                    <AlertTriangle size={14} color="#FFBD2E" />
                    <span>{issue.message}</span>
                  </div>
                  {issue.fix_hint && (
                    <div className={styles.fixHint}>
                      <strong>PRO-TIP:</strong> {issue.fix_hint}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
