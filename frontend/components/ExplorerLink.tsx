'use client';

import { ExternalLink } from 'lucide-react';

interface ExplorerLinkProps {
  type: 'transaction' | 'asset' | 'address';
  id: string;
  label?: string;
  className?: string;
}

export default function ExplorerLink({ type, id, label, className }: ExplorerLinkProps) {
  if (!id) return null;

  const baseUrl = 'https://testnet.algoexplorer.io'; // Standardized for VORTEX Testnet
  const path = type === 'transaction' ? 'tx' : type === 'asset' ? 'asset' : 'address';
  const url = `${baseUrl}/${path}/${id}`;

  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer" 
      className={`link inline-flex items-center gap-1 ${className || ''}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
    >
      {label || (id.length > 12 ? `${id.slice(0, 6)}...${id.slice(-4)}` : id)}
      <ExternalLink size={12} />
    </a>
  );
}
