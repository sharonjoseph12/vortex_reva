'use client';

import React from 'react';
import { ShieldCheck, FileText, Download, Hash, Calendar, DollarSign } from 'lucide-react';
import styles from './ComplianceReceipt.module.css';
import { type FiscalReceipt } from '@/lib/api';

interface Props {
  receipt: FiscalReceipt;
}

export default function ComplianceReceipt({ receipt }: Props) {
  return (
    <div className={styles.container}>
      {/* Branded Header */}
      <div className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.logo}>V</div>
          <div className={styles.brandText}>
            <span className={styles.protocolName}>VORTEX</span>
            <span className={styles.tagline}>FISCAL ADVISORY CORE</span>
          </div>
        </div>
        <div className={styles.signedBadge}>
          <ShieldCheck size={14} /> SIGNED BY ORACLE
        </div>
      </div>

      {/* Main Body */}
      <div className={styles.body}>
        <div className={styles.titleInfo}>
          <h2>Settlement Receipt</h2>
          <span className={styles.id}>REF: {receipt.bounty_id.slice(0, 16).toUpperCase()}</span>
        </div>

        <div className={styles.mainGrid}>
          <Record label="Settlement Amount" value={`${receipt.amount_algo} ALGO`} icon={<DollarSign size={14} />} />
          <Record label="Settled Date" value={new Date(receipt.settled_at).toLocaleString()} icon={<Calendar size={14} />} />
        </div>

        <div className={styles.divider} />

        <div className={styles.stack}>
          <Record label="Origin (Buyer)" value={receipt.buyer} />
          <Record label="Destination (Seller)" value={receipt.seller} />
          <Record label="Algorand TX-ID" value={receipt.tx_id} />
        </div>

        <div className={styles.footerSignature}>
          <div className={styles.sigLabel}><Hash size={12} /> Oracle Cryptographic Proof</div>
          <div className={styles.sigValue}>{receipt.oracle_signature}</div>
          <div className={styles.hashValue}>Integrity Hash: {receipt.fiscal_hash}</div>
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button className={styles.downloadBtn}>
          <Download size={16} /> DOWNLOAD CERTIFIED PDF
        </button>
      </div>
    </div>
  );
}

function Record({ label, value, icon }: { label: string, value: string, icon?: React.ReactNode }) {
  return (
    <div className={styles.record}>
      <span className={styles.rLabel}>{label}</span>
      <div className={styles.rValue}>
        {icon && <span className={styles.rIcon}>{icon}</span>}
        <span>{value}</span>
      </div>
    </div>
  );
}
