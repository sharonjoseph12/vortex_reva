/**
 * VORTEX Wallet Integration
 * =========================
 * Pera Wallet + Defly Wallet Connect + demo mode bypass.
 */

import { PeraWalletConnect } from '@perawallet/connect';
import { DeflyWalletConnect } from '@blockshake/defly-connect';
import { requestNonce, verifyAuth } from './api';
import { useAuthStore } from './store';
import { toast } from 'sonner';

// Provider Instances
let peraWallet: PeraWalletConnect | null = null;
let deflyWallet: DeflyWalletConnect | null = null;

function getPeraWallet(): PeraWalletConnect {
  if (!peraWallet) {
    peraWallet = new PeraWalletConnect({
      shouldShowSignTxnToast: true,
    });
  }
  return peraWallet;
}

function getDeflyWallet(): DeflyWalletConnect {
  if (!deflyWallet) {
    deflyWallet = new DeflyWalletConnect({
      shouldShowSignTxnToast: true,
    });
  }
  return deflyWallet;
}

/**
 * Watchdog helper to prevent SDK hangs.
 */
function withTimeout<T>(promise: Promise<T>, ms = 30000, context = 'Protocol Operation'): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`${context} Timed Out (30s)`)), ms);
  });
  return Promise.race([promise, timeout]);
}

/**
 * Handle a Wallet provider connection and auth challenge.
 */
async function performWalletAuth(
  provider: PeraWalletConnect | DeflyWalletConnect,
  role: 'buyer' | 'seller'
): Promise<void> {
  console.info(`[VORTEX-AUTH] Starting ${role} authentication sequence...`);
  try {
    let accounts: string[] = [];
    
    // 0. Handshake
    console.info(`[VORTEX-AUTH] Step 0: Initializing Bridge Handshake...`);
    toast.message("Handshake starting...", { description: "Establishing bridge connection." });
    
    // Purge or reconnect
    try { 
      console.info(`[VORTEX-AUTH] Checking existing provider sessions...`);
      accounts = await provider.reconnectSession();
    } catch { /* no active session */ }
    
    if (!accounts || accounts.length === 0) {
      console.info(`[VORTEX-AUTH] Awaiting provider.connect()...`);
      accounts = await withTimeout(provider.connect(), 45000, 'Handshake/Connect');
    }
    
    if (accounts.length === 0) throw new Error('No accounts found');
    const wallet = accounts[0];
    console.info(`[VORTEX-AUTH] Handshake successful. Wallet: ${wallet}`);
    toast.message("Handshake established.", { description: "Requesting auth challenge..." });

    // 1. Get nonce from VORTEX Modular Identity Service
    console.info(`[VORTEX-AUTH] Step 1: Requesting nonce from backend...`);
    const nonceRes = await requestNonce(wallet);
    const nonce = nonceRes.data.nonce;

    // 2. Format challenge message (ARC-0001 alignment)
    const message = `VORTEX_AUTH_v1:${nonce}:${wallet}`;
    const encoder = new TextEncoder();
    const msgBytes = encoder.encode(message);

    console.info(`[VORTEX-AUTH] Step 2: Challenge formatted. Ready for signature.`);
    toast.info("Challenge Ready.", { 
      description: "Check your phone for the signature prompt.",
      duration: 10000
    });

    // 3. Request Signature
    console.info(`[VORTEX-AUTH] Step 3: Awaiting signData signature from mobile...`);
    const signedBytes = await withTimeout(
      (provider as any).signData(
        [{ data: msgBytes, message: 'Authenticate with VORTEX Protocol' }],
        wallet
      ),
      60000,
      'Signature Prompt'
    );

    console.info(`[VORTEX-AUTH] Signature received.`);
    toast.message("Proof Received.", { description: "Finalizing on-chain verify..." });

    // 4. Encode Signature
    console.info(`[VORTEX-AUTH] Step 4: Encoding cryptographic and finalizing...`);
    const signature = btoa(
      String.fromCharCode(...new Uint8Array((signedBytes as Uint8Array[])[0]))
    );

    // 5. Finalize Verification
    console.info(`[VORTEX-AUTH] Step 5: Sending verify payload to backend...`);
    const authRes = await verifyAuth(wallet, nonce, signature, role);
    
    console.info(`[VORTEX-AUTH] Verification confirmed. Logging in...`);
    useAuthStore.getState().login(wallet, role, authRes.data.token);
    
    toast.success("Sovereign Identity Confirmed.", { description: "Accessing Mission Terminal..." });
    console.info(`[VORTEX-AUTH] Sequence Complete.`);

  } catch (error) {
    console.error(`[VORTEX-AUTH] CRITICAL FAILURE:`, error);
    const msg = error instanceof Error ? error.message : 'Unknown Identity Error';
    toast.error("Handshake Failed", { description: msg });
    throw error;
  }
}

export async function connectPeraWallet(role: 'buyer' | 'seller'): Promise<void> {
  return performWalletAuth(getPeraWallet(), role);
}

export async function connectDeflyWallet(role: 'buyer' | 'seller'): Promise<void> {
  return performWalletAuth(getDeflyWallet(), role);
}

/**
 * Demo login — bypasses Pera Wallet for testing.
 */
export async function demoLogin(role: 'buyer' | 'seller'): Promise<void> {
  const wallet = 'HR7AKO5XI57MGHPCLC53L3SYGVHDS2RXRO65EPZSESXCJ3HDQJNWPKSRZ4';

  try {
    const nonceRes = await requestNonce(wallet);
    const nonce = nonceRes.data.nonce;
    const demoSig = btoa('demo_signature_' + nonce);

    const authRes = await verifyAuth(wallet, nonce, demoSig, role);
    useAuthStore.getState().login(wallet, role, authRes.data.token);
  } catch (error) {
    console.error('Demo login failed:', error);
    throw error;
  }
}

/**
 * Disconnect wallet — purges all active sessions.
 */
export async function disconnectWallet(): Promise<void> {
  try {
    if (peraWallet) await peraWallet.disconnect();
    if (deflyWallet) await deflyWallet.disconnect();
  } catch {
    // ignore
  }
  useAuthStore.getState().logout();
}

/**
 * Utility: Truncate wallet address.
 */
export function truncateAddress(address: string, chars = 6): string {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-4)}`;
}
