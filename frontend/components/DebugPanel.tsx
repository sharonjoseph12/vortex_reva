'use client';

import { useAuthStore } from '@/lib/store';
import { useEffect, useState } from 'react';

/**
 * Sovereign Debug Panel
 * =====================
 * Exposes internal protocol state for mission forensics.
 */
export default function DebugPanel() {
  const { wallet, isConnected, role, token } = useAuthStore();
  const [lsBuyer, setLsBuyer] = useState<string | null>(null);
  const [lsSeller, setLsSeller] = useState<string | null>(null);
  const [lsRole, setLsRole] = useState<string | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const check = () => {
      setLsBuyer(localStorage.getItem('vortex_token_buyer'));
      setLsSeller(localStorage.getItem('vortex_token_seller'));
      setLsRole(localStorage.getItem('vortex_active_role'));
    };
    check();
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!visible) return (
    <button
      onClick={() => setVisible(true)}
      style={{ position: 'fixed', bottom: 10, left: 10, zIndex: 9999, fontSize: '10px', opacity: 0.5 }}
    >
      Show Debug
    </button>
  );

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      zIndex: 9999,
      background: 'rgba(15, 23, 42, 0.95)',
      border: '1px solid #14a800',
      borderRadius: '8px',
      padding: '12px',
      color: '#fff',
      fontFamily: 'monospace',
      fontSize: '11px',
      width: '280px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #334155', paddingBottom: '4px' }}>
        <span style={{ color: '#14a800', fontWeight: 'bold' }}>VORTEX FORENSICS</span>
        <button onClick={() => setVisible(false)} style={{ color: '#94a3b8' }}>[hide]</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '4px' }}>
        <span style={{ color: '#94a3b8' }}>Z_WALLET:</span>
        <span style={{ color: wallet ? '#fff' : '#ef4444' }}>{wallet ? `${wallet.slice(0, 6)}...` : 'NULL'}</span>

        <span style={{ color: '#94a3b8' }}>Z_CONN:</span>
        <span style={{ color: isConnected ? '#14a800' : '#ef4444' }}>{String(isConnected).toUpperCase()}</span>

        <span style={{ color: '#94a3b8' }}>Z_ROLE:</span>
        <span>{role || 'NONE'}</span>

        <span style={{ color: '#94a3b8' }}>Z_TOKEN:</span>
        <span>{token ? 'VALID' : 'MISSING'}</span>

        <div style={{ gridColumn: 'span 2', height: '8px' }} />

        <span style={{ color: '#94a3b8' }}>LS_BUY_TOK:</span>
        <span style={{ color: lsBuyer ? '#14a800' : '#94a3b8' }}>{lsBuyer ? 'PRESENT' : 'EMPTY'}</span>

        <span style={{ color: '#94a3b8' }}>LS_SEL_TOK:</span>
        <span style={{ color: lsSeller ? '#14a800' : '#94a3b8' }}>{lsSeller ? 'PRESENT' : 'EMPTY'}</span>

        <span style={{ color: '#94a3b8' }}>LS_ACTIVE:</span>
        <span>{lsRole || 'EMPTY'}</span>
      </div>

      <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '8px' }}>

        <button
          onClick={() => { localStorage.clear(); window.location.reload(); }}
          style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', width: '100%', fontSize: '10px' }}
        >
          FORCE CACHE WIPE (HARD RESET)
        </button>
      </div>
    </div>
  );
}
