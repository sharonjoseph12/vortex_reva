'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { demoLogin, connectPeraWallet, connectDeflyWallet } from '@/lib/wallet';
import { getHealth, type HealthData } from '@/lib/api';
import {
  Zap, Wallet, Shield, Code, Activity, Image as ImageIcon, Briefcase, FileSignature,
  CheckCircle, Plus, Users, Globe, ArrowRight, Star
} from 'lucide-react';
import LivePulse from '@/components/LivePulse';
import { toast } from 'sonner';
import DebugPanel from '@/components/DebugPanel';
import styles from './page.module.css';

export default function LandingPage() {
  const router = useRouter();
  const isConnected = useAuthStore((state) => state.isConnected);
  const hydrate = useAuthStore((state) => state.hydrate);
  const [selectedRole, setSelectedRole] = useState<'buyer' | 'seller'>('buyer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [health, setHealth] = useState<HealthData | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Reactive Navigation: Once connected, force redirect
  useEffect(() => {
    if (isConnected) {
      console.log("[VORTEX] Connection detected. Finalizing handoff...");
      router.push('/dashboard');
    }
  }, [isConnected]);

  useEffect(() => {
    getHealth()
      .then((res) => setHealth(res.data))
      .catch(() => { });
  }, []);

  async function handleDemoLogin() {
    setLoading(true);
    setError('');
    try {
      await demoLogin(selectedRole);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Demo login failed');
      setLoading(false);
    }
  }

  async function handleWalletConnect(provider: 'pera' | 'defly') {
    setLoading(true);
    setError('');
    try {
      if (provider === 'pera') await connectPeraWallet(selectedRole);
      else await connectDeflyWallet(selectedRole);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Wallet connection failed');
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.bgDecoration} />

      <div className={styles.container}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroLayout}>
            <div className={styles.heroMain}>
              <div className={styles.badge_new}>
                <span>New</span> Secure Escrow for Design & Docs
              </div>
              <h1 className={styles.title}>
                The World's Work <span>Verified</span> On-Chain.
              </h1>
              <p className={styles.desc}>
                VORTEX is the premium marketplace for high-stakes digital assets.
                From Python microservices to Brand Identity, every deliverable is verified
                by our 2-of-3 Oracle Consensus before payment is released.
              </p>
              <div style={{ display: 'flex', gap: '16px' }}>
                <button className="btn btn-primary btn-lg" onClick={() => document.getElementById('login-section')?.scrollIntoView({ behavior: 'smooth' })}>
                  Start Hiring <ArrowRight size={18} />
                </button>
                <button className="btn btn-secondary btn-lg">Explore Talents</button>
              </div>
            </div>
            <div className={styles.heroVisual}>
              <LivePulse />
            </div>
          </div>
        </section>

        {/* Categories Grid */}
        <div className={styles.categoryGrid}>
          <CategoryCard
            icon={<Code size={24} />}
            title="Software & Code"
            desc="Automated verification via AST & Docker sandboxing. Python, JS, Rust."
          />
          <CategoryCard
            icon={<ImageIcon size={24} />}
            title="Design & Media"
            desc="Visual assets evaluated by AI Vision agents against your brand guidelines."
          />
          <CategoryCard
            icon={<FileSignature size={24} />}
            title="Writing & Docs"
            desc="Technical reports and contracts verified for logic, tone, and compliance."
          />
        </div>

        {/* Login Section */}
        <div id="login-section" style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
          <div className={styles.loginFloating}>
            <div className={styles.loginHeader}>
              <h2 className={styles.loginTitle}>Connect to Vortex</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Choose your role to enter the marketplace</p>
            </div>

            <div className={styles.roleGrid}>
              <div
                className={`${styles.roleBox} ${selectedRole === 'buyer' ? styles.roleBoxActive : ''}`}
                onClick={() => setSelectedRole('buyer')}
              >
                <Shield className={styles.roleIcon} size={24} />
                <span className={styles.roleName}>Hire Talent</span>
              </div>
              <div
                className={`${styles.roleBox} ${selectedRole === 'seller' ? styles.roleBoxActive : ''}`}
                onClick={() => setSelectedRole('seller')}
              >
                <Briefcase className={styles.roleIcon} size={24} />
                <span className={styles.roleName}>Solve Bounties</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleDemoLogin}
                disabled={loading}
                style={{ width: '100%' }}
              >
                {loading ? 'Entering Proxy...' : `Continue as ${selectedRole === 'buyer' ? 'Buyer' : 'Partner'}`}
              </button>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => handleWalletConnect('pera')}
                  disabled={loading}
                >
                  <Wallet size={16} /> Pera
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => handleWalletConnect('defly')}
                  disabled={loading}
                >
                  <Activity size={16} /> Defly
                </button>
              </div>
            </div>

            {isConnected && (
              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', background: 'var(--accent-primary)', color: '#fff' }}
                  onClick={() => router.push('/dashboard')}
                >
                  Enter Portal <ArrowRight size={18} />
                </button>
              </div>
            )}

            {error && <div style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', marginTop: '16px', textAlign: 'center' }}>{error}</div>}
          </div>
        </div>

        {/* Trust & Status */}
        <div className={styles.trustBar}>
          <div className={styles.trustItem}><Globe size={16} /> Algorand Network</div>
          <div className={styles.trustItem}><CheckCircle size={16} /> 2-of-3 Consensus</div>
          <div className={styles.trustItem}><Users size={16} /> 10k+ Solvers</div>
          <div className={styles.trustItem}><Star size={16} /> Enterprise Grade</div>
        </div>
      </div>
      <DebugPanel />
    </div>
  );
}

function CategoryCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className={styles.categoryCard}>
      <div className={styles.iconWrapper}>{icon}</div>
      <h3 className={styles.catTitle}>{title}</h3>
      <p className={styles.catDesc}>{desc}</p>
    </div>
  );
}
