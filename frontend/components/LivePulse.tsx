'use client';

import { useEffect, useState, useRef } from 'react';
import { Activity, Zap, ShieldCheck, Gavel, ArrowUpRight } from 'lucide-react';
import styles from './LivePulse.module.css';

interface PulseEvent {
  event: string;
  data: {
    bounty_id?: string;
    amount?: number;
    type?: string;
    resolution?: string;
    timestamp: string;
  };
}

export default function LivePulse() {
  const [events, setEvents] = useState<PulseEvent[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sse = new EventSource('http://localhost:8000/pulse');
    
    sse.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        const newEvent: PulseEvent = {
          event: e.type || 'ACTIVITY', // Actually SSE 'event' field is in e.type if named
          data: payload
        };
        // If event is just the generic 'message', starlette might not set type.
        // We'll trust the payload structure.
        setEvents(prev => [newEvent, ...prev].slice(0, 10));
      } catch (err) {
        console.error('Pulse parse error', err);
      }
    };

    // Polyfill for generic 'message' if event isn't named
    sse.addEventListener('SETTLEMENT', (e: any) => {
      const payload = JSON.parse(e.data);
      setEvents(prev => [{ event: 'SETTLEMENT', data: payload }, ...prev].slice(0, 8));
    });

    sse.addEventListener('GOVERNANCE_RESOLVED', (e: any) => {
      const payload = JSON.parse(e.data);
      setEvents(prev => [{ event: 'GOVERNANCE_RESOLVED', data: payload }, ...prev].slice(0, 8));
    });

    return () => sse.close();
  }, []);

  return (
    <div className={styles.pulseContainer}>
      <div className={styles.pulseHeader}>
        <Activity size={16} className="spin-slow" />
        <span>Protocol Live Stream</span>
      </div>
      <div className={styles.pulseList} ref={scrollRef}>
        {events.length === 0 ? (
          <div className={styles.empty}>Awaiting incoming protocol activity...</div>
        ) : (
          events.map((ev, i) => (
            <div key={i} className={styles.pulseItem}>
              <div className={styles.iconBox}>
                {ev.event === 'SETTLEMENT' ? <Zap size={14} color="var(--accent-primary)" /> : <Gavel size={14} color="var(--accent-secondary)" />}
              </div>
              <div className={styles.content}>
                <div className={styles.eventType}>
                  {ev.event === 'SETTLEMENT' ? 'Automated Settlement' : 'DAO Resolution'}
                </div>
                <div className={styles.eventDetail}>
                  {ev.event === 'SETTLEMENT' 
                    ? `${ev.data.amount} ALGO → Verified ${ev.data.type}`
                    : `Dispute ${ev.data.resolution?.toUpperCase()}ED by Quorum`
                  }
                </div>
              </div>
              <div className={styles.time}>
                {new Date(ev.data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>
          ))
        )}
      </div>
      <div className={styles.pulseFooter}>
        <ShieldCheck size={12} /> Elite Trust Network Active
      </div>
    </div>
  );
}
