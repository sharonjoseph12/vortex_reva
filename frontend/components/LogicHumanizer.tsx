'use client';

import React, { useState, useEffect } from 'react';
import { Cpu, CheckCircle, Info, Loader2 } from 'lucide-react';

interface LogicHumanizerProps {
  criteria: string;
}

export default function LogicHumanizer({ criteria }: LogicHumanizerProps) {
  const [summary, setSummary] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function summarize() {
      if (!criteria) {
        setLoading(false);
        return;
      }
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${API_URL}/pipeline/summarize-criteria`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ criteria })
        });
        const data = await res.json();
        if (data.success && data.data.summary) {
          // Expecting bullet points from AI
          const lines = data.data.summary.split('\n')
            .map((l: string) => l.replace(/^[*-]\s*/, '').trim())
            .filter(Boolean);
          setSummary(lines);
        }
      } catch (err) {
        console.error("Logic Humanizer Failed:", err);
      } finally {
        setLoading(false);
      }
    }
    summarize();
  }, [criteria]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
         <Loader2 className="animate-spin" size={18} color="var(--accent-primary)" />
         <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>AI Synthesis of Protocol Constraints...</span>
      </div>
    );
  }

  if (summary.length === 0) {
    return (
       <div style={{ padding: '20px', background: 'rgba(255,208,0,0.05)', borderRadius: '12px', border: '1px solid rgba(255,208,0,0.2)', fontSize: '0.85rem', color: 'var(--accent-warning)' }}>
          <Info size={16} /> No explicit logic constraints found in artifact signature.
       </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--accent-primary)', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ background: 'rgba(0, 208, 255, 0.1)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--accent-primary)' }}>
        <Cpu size={16} color="var(--accent-primary)" />
        <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Logic Synthesis: Critical Bounds</span>
      </div>
      <div style={{ padding: '20px' }}>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {summary.map((text, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ marginTop: '2px' }}><CheckCircle size={14} color="var(--accent-primary)" /></div>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
