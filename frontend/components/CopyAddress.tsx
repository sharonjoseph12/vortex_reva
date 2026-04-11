'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function CopyAddress({ 
  address, 
  chars = 6 
}: { 
  address: string, 
  chars?: number 
}) {
  const [copied, setCopied] = useState(false);

  // Shorten: 0x123456...abcdef
  const displayAddress = address 
    ? `${address.slice(0, chars)}...${address.slice(-chars)}`
    : 'UNKNOWN';

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    toast.success('Identity Hash Copied to Clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span 
      onClick={handleCopy}
      title="Copy Full Address"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        cursor: 'pointer',
        fontFamily: 'var(--font-mono)',
        color: 'var(--accent-primary)',
        background: 'var(--bg-tertiary)',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '0.85em',
        transition: 'all 0.2s',
      }}
      className="hover-brighten"
    >
      {displayAddress}
      {copied ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
    </span>
  );
}
