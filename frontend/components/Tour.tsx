'use client';

import { useState, useEffect } from 'react';
import { HelpCircle, ChevronRight, X, Sparkles } from 'lucide-react';
import styles from './Tour.module.css';

const TOUR_STEPS = [
  {
    title: "Sovereign Dashboard",
    content: "Welcome to your command center. Monitor your earnings, reputation, and platform status in real-time.",
    target: "dashboard-header"
  },
  {
    title: "Strategic Treasury",
    content: "Manage your settlements and staked ALGO. The VORTEX DAO rewards active governance participation.",
    target: "treasury-summary"
  },
  {
    title: "Forensic Adjudication",
    content: "Visit the DAO tab to resolve disputes. High-rep Partners act as the ultimate truth layer for decentralized work.",
    target: "dao-link"
  }
];

export default function Tour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('vortex_tour_seen');
    if (!hasSeenTour) {
      setTimeout(() => setActive(true), 2000);
    }
  }, []);

  const dismiss = () => {
    setActive(false);
    localStorage.setItem('vortex_tour_seen', 'true');
  };

  const next = () => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  };

  if (!active) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.tooltip}>
        <div className={styles.header}>
          <div className={styles.title}>
            <Sparkles size={16} color="var(--accent-secondary)" />
            <span>{TOUR_STEPS[step].title}</span>
          </div>
          <button onClick={dismiss} className={styles.closeBtn}><X size={16} /></button>
        </div>
        <div className={styles.body}>
          {TOUR_STEPS[step].content}
        </div>
        <div className={styles.footer}>
          <div className={styles.progress}>
            {TOUR_STEPS.map((_, i) => (
              <div key={i} className={`${styles.dot} ${i === step ? styles.dotActive : ''}`} />
            ))}
          </div>
          <button className="btn btn-primary btn-sm" onClick={next}>
            {step === TOUR_STEPS.length - 1 ? "Start Adjudicating" : "Next Insight"}
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
