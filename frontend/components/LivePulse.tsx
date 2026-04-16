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

import { supabase } from '@/lib/supabase';

export default function LivePulse() {
  const [events, setEvents] = useState<PulseEvent[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Subscribe to Global Protocol Pulse via Supabase Realtime
    const channel = supabase.channel('protocol_pulse', {
      config: { broadcast: { self: true } }
    })
    .on('broadcast', { event: '*' }, (payload: any) => {
      console.log('[VORTEX-PULSE] Event Received:', payload);
      const newEvent: PulseEvent = {
        event: payload.event,
        data: payload.payload.data
      };
      setEvents(prev => [newEvent, ...prev].slice(0, 10));
    })
    .subscribe((status: string) => {
      console.log('[VORTEX-PULSE] Subscription Status:', status);
    });

    return () => {
      supabase.removeChannel(channel);
    };
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
