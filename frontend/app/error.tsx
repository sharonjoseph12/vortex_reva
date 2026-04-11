'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, Terminal } from 'lucide-react';
import styles from './error.module.css';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[VORTEX Kernel Panic]', error);
  }, [error]);

  return (
    <div className={styles.errorContainer}>
      <div className={styles.errorBox}>
        <div className={styles.header}>
          <AlertTriangle size={32} color="var(--danger)" />
          <h1 className={styles.title}>SYSTEM MALFUNCTION</h1>
        </div>
        
        <p className={styles.subtitle}>
          The Sovereign Hub encountered a fatal exception during telemetry extraction.
        </p>

        <div className={styles.terminal}>
          <div className={styles.tHead}>
            <Terminal size={14} /> /var/log/vortex-panic.log
          </div>
          <pre className={styles.tBody}>
            {error.message || 'Unknown runtime anomaly.'}
            {error.digest && `\nDigest: ${error.digest}`}
          </pre>
        </div>

        <div className={styles.actions}>
          <button className="btn btn-primary" onClick={() => reset()}>
            INITIATE SYSTEM REBOOT
          </button>
          <a href="/" className="btn btn-ghost">
            RETURN TO COMMAND CENTER
          </a>
        </div>
      </div>
    </div>
  );
}
