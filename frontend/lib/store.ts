/**
 * VORTEX Zustand Store
 * ====================
 * Auth state + UI state with localStorage persistence.
 */

import { create } from 'zustand';

interface AuthState {
  wallet: string | null;
  role: 'buyer' | 'seller' | null;
  token: string | null;
  sessions: {
    buyer: { wallet: string; token: string } | null;
    seller: { wallet: string; token: string } | null;
  };
  reputationScore: number;
  totalEarned: number;
  totalLocked: number;
  isConnected: boolean;

  // Actions
  login: (wallet: string, role: 'buyer' | 'seller', token: string) => void;
  logout: () => void;
  switchRole: (role: 'buyer' | 'seller') => void;
  updateStats: (stats: { reputationScore?: number; totalEarned?: number; totalLocked?: number }) => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  wallet: null,
  role: null,
  token: null,
  sessions: {
    buyer: null,
    seller: null,
  },
  reputationScore: 0,
  totalEarned: 0,
  totalLocked: 0,
  isConnected: false,

  login: (wallet, role, token) => {
    localStorage.setItem(`vortex_token_${role}`, token);
    localStorage.setItem(`vortex_wallet_${role}`, wallet);
    localStorage.setItem('vortex_active_role', role);

    set((state) => ({
      wallet,
      role,
      token,
      isConnected: true,
      sessions: {
        ...state.sessions,
        [role]: { wallet, token },
      },
    }));
  },

  switchRole: (newRole) => {
    const session = get().sessions[newRole];
    if (session) {
      localStorage.setItem('vortex_active_role', newRole);
      set({
        role: newRole,
        wallet: session.wallet,
        token: session.token,
      });
    }
  },

  logout: () => {
    ['buyer', 'seller'].forEach((r) => {
      localStorage.removeItem(`vortex_token_${r}`);
      localStorage.removeItem(`vortex_wallet_${r}`);
    });
    localStorage.removeItem('vortex_active_role');
    set({
      wallet: null,
      role: null,
      token: null,
      sessions: { buyer: null, seller: null },
      isConnected: false,
      reputationScore: 0,
      totalEarned: 0,
      totalLocked: 0,
    });
  },

  updateStats: (stats) => {
    set((state) => ({
      reputationScore: stats.reputationScore ?? state.reputationScore,
      totalEarned: stats.totalEarned ?? state.totalEarned,
      totalLocked: stats.totalLocked ?? state.totalLocked,
    }));
  },

  hydrate: () => {
    if (typeof window === 'undefined') return;
    
    const buyerToken = localStorage.getItem('vortex_token_buyer');
    const buyerWallet = localStorage.getItem('vortex_wallet_buyer');
    const sellerToken = localStorage.getItem('vortex_token_seller');
    const sellerWallet = localStorage.getItem('vortex_wallet_seller');
    const activeRole = localStorage.getItem('vortex_active_role') as 'buyer' | 'seller' | null;

    const sessions = {
      buyer: buyerToken && buyerWallet ? { token: buyerToken, wallet: buyerWallet } : null,
      seller: sellerToken && sellerWallet ? { token: sellerToken, wallet: sellerWallet } : null,
    };

    const currentRole = activeRole || (sessions.buyer ? 'buyer' : (sessions.seller ? 'seller' : null));
    const currentSession = currentRole ? sessions[currentRole] : null;

    if (currentSession) {
      set({
        sessions,
        role: currentRole,
        wallet: currentSession.wallet,
        token: currentSession.token,
        isConnected: true,
      });
    }
  },
}));
