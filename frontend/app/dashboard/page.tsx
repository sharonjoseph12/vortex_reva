'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { listBounties, getMe, getHealth, updateProfile, getMySubmissions, type BountyData, type HealthData, type UserData } from '@/lib/api';
import { truncateAddress } from '@/lib/wallet';
import {
  Target, Zap, TrendingUp, Lock, Star,
  Activity, Shield, Award, Edit3, ArrowRight, User as UserIcon,
  Cpu, Server, CheckCircle, XCircle, Plus, Users
} from 'lucide-react';
import Tour from '@/components/Tour';
import styles from './page.module.css';
import CopyAddress from '@/components/CopyAddress';
import ExplorerLink from '@/components/ExplorerLink';
import { toast } from 'sonner';

import PulseChart from '@/components/PulseChart';

export default function DashboardPage() {
  const router = useRouter();
  const { wallet, role } = useAuthStore();
  const [bounties, setBounties] = useState<BountyData[]>([]);
  const [myBounties, setMyBounties] = useState<BountyData[]>([]);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [stats, setStats] = useState({ earned: 0, locked: 0, staked: 0, reputation: 0 });
  const [myWork, setMyWork] = useState<Array<{ id: string; bounty_id: string; bounty_title: string; reward_algo: number; status: string; submitted_at: string; tx_id: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    tagline: '',
    bio: '',
    github_url: '',
    skills: ''
  });
  const [updating, setUpdating] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [bountyRes, healthRes] = await Promise.all([
          listBounties({ limit: 5, sort: 'newest' }),
          getHealth(),
        ]);
        setBounties(bountyRes.data.bounties);
        setHealth(healthRes.data);

        // Fetch wallet-specific bounties (buyer's posted bounties)
        if (wallet) {
          try {
            const myBountyRes = await listBounties({ buyer: wallet, limit: 10 });
            setMyBounties(myBountyRes.data.bounties);
          } catch {}
        }

        try {
          const meRes = await getMe();
          setStats({
            earned: meRes.data.total_earned,
            locked: meRes.data.total_locked,
            staked: meRes.data.total_staked || 0,
            reputation: meRes.data.reputation_score,
          });
          const isComplete = !!meRes.data.tagline;
          setProfileForm({
            tagline: meRes.data.tagline || '',
            bio: meRes.data.bio || '',
            github_url: meRes.data.github_url || '',
            skills: (meRes.data.skills || []).join(', ')
          });
          // If totally empty profile, show welcome onboarding
          if (!isComplete) {
            setShowWelcome(true);
          }
        } catch {}

        if (role === 'seller') {
          try {
            const subsRes = await getMySubmissions();
            setMyWork(subsRes.data.submissions || []);
          } catch {}
        }
      } catch {
        // Backend offline
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setUpdating(true);
    try {
      await updateProfile({
        ...profileForm,
        skills: profileForm.skills.split(',').map(s => s.trim()).filter(Boolean)
      });
      toast.success('Identity Vector Synchronized: Profile updated successfully');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Profile update failed');
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="page-container">
      <Tour />
      {/* Header */}
      <div id="dashboard-header" className="page-header" style={{ marginBottom: 'var(--space-2xl)' }}>
        <div className={styles.headerRow}>
          <div>
            <h1 className="page-title">
              Welcome, {role === 'buyer' ? 'Director' : 'Solver'}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {wallet ? <CopyAddress address={wallet} chars={12} /> : <span className="badge badge-pending">Anonymous</span>}
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>· Enterprise Tier</span>
              {wallet && (
                <ExplorerLink type="address" id={wallet} label="View on Ledger" />
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className={`btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab(activeTab === 'settings' ? 'overview' : 'settings')}
            >
              {activeTab === 'settings' ? 'Back to Dashboard' : 'Profile Settings'}
            </button>
            <Link href={role === 'buyer' ? '/bounties/create' : '/bounties'} className="btn btn-primary" style={{ display: activeTab === 'settings' ? 'none' : 'flex' }}>
              {role === 'buyer' ? (
                <><Target size={16} /> Create Task</>
              ) : (
                <><Zap size={16} /> Browse Tasks</>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Financial Intelligence: Treasury Summary */}
      {activeTab === 'overview' && (
        <div id="treasury-summary" className="card" style={{ marginBottom: 'var(--space-xl)', background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
          <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px', padding: '24px 24px 0' }}>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>
                Mission Control
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Operational Status: <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>CONNECTED [{wallet?.slice(0, 8)}]</span>
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="btn btn-primary" 
                onClick={() => router.push('/bounties/create')}
                disabled={!profileForm.tagline}
                title={!profileForm.tagline ? "Complete profile to post bounties" : "Create new bounty"}
              >
                <Plus size={18} /> Deploy Bounty
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => router.push('/bounties')}
              >
                <Users size={18} /> Solve Bounties
              </button>
            </div>
          </div>

          {!profileForm.tagline && (
            <div className="card" style={{ 
              background: 'linear-gradient(90deg, var(--bg-card) 0%, rgba(0, 208, 255, 0.05) 100%)',
              border: '1px solid var(--accent-primary)',
              padding: '24px',
              margin: '0 24px 32px',
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ 
                background: 'var(--accent-primary)', 
                width: '4px', 
                height: '100%', 
                position: 'absolute', 
                left: 0, 
                top: 0 
              }} />
              <div style={{ background: 'rgba(0, 208, 255, 0.1)', padding: '12px', borderRadius: '8px', color: 'var(--accent-primary)' }}>
                <Activity size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Initialize Your Professional Identity</h3>
                <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Your profile is currently anonymous. Complete your tagline and bio to gain access to escrow posting and solving privileges.
                </p>
              </div>
              <button className="btn btn-primary" onClick={() => setActiveTab('settings')}>
                Complete Profile <ArrowRight size={16} />
              </button>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-secondary)', letterSpacing: '0.05em', marginBottom: '4px' }}>
                <TrendingUp size={12} style={{ marginRight: '6px' }} /> Strategic Treasury Balance
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {(stats.earned + stats.locked + stats.staked).toFixed(2)} <span style={{ fontSize: '1rem', color: 'var(--text-tertiary)' }}>ALGO Total</span>
              </div>
            </div>
            <Link href="/transactions" className="btn btn-secondary btn-sm">
              Auditor View <ArrowRight size={14} />
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'var(--border-color)' }}>
             <div style={{ background: 'var(--bg-card)', padding: '16px 24px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Liquid Settlements</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{stats.earned.toFixed(2)}</div>
             </div>
             <div style={{ background: 'var(--bg-card)', padding: '16px 24px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Active Escrow</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-warning)' }}>{stats.locked.toFixed(2)}</div>
             </div>
             <div style={{ background: 'var(--bg-card)', padding: '16px 24px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>Trust Staked (DAO)</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>{stats.staked.toFixed(2)}</div>
             </div>
          </div>

          <div style={{ marginTop: '32px', padding: '0 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <Activity size={18} color="var(--accent-primary)" />
              <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Sovereign Protocol Pulse
              </h3>
              <div className="badge badge-active" style={{ fontSize: '0.65rem' }}>Global Stats</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="card" style={{ padding: '20px', background: 'rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <Shield size={20} color="var(--accent-secondary)" />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 700 }}>PROTOCOL TVL</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                  {(health as any)?.total_value_locked_algo?.toFixed(1) || '0.0'} <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>ALGO</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>Value Immutably Locked in Escrew</div>
              </div>
              <div className="card" style={{ padding: '20px', background: 'rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <Zap size={20} color="var(--accent-primary)" />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 700 }}>CONSENSUS VELOCITY</span>
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                  {(health as any)?.consensus_velocity_hours || '0.0'}h
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>Avg Multi-Sig Settlement Time</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' ? (
        <div className="section" style={{ maxWidth: '800px' }}>
          <h3 className="section-title">Verified Identity Management</h3>
          <form onSubmit={handleUpdateProfile} className="card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="field">
              <label className="input-label">Professional Tagline</label>
              <input 
                className="input" 
                value={profileForm.tagline}
                onChange={(e) => setProfileForm({...profileForm, tagline: e.target.value})}
                placeholder="e.g. Senior Smart Contract Auditor | Python Specialist"
              />
            </div>
            <div className="field">
              <label className="input-label">Detailed Biography</label>
              <textarea 
                className="textarea" 
                value={profileForm.bio}
                onChange={(e) => setProfileForm({...profileForm, bio: e.target.value})}
                placeholder="Tell your story to potential partners..."
                style={{ minHeight: '150px' }}
              />
            </div>
            <div className="field">
              <label className="input-label">Core Skills (comma separated)</label>
              <input 
                className="input" 
                value={profileForm.skills}
                onChange={(e) => setProfileForm({...profileForm, skills: e.target.value})}
                placeholder="Python, Algorand, React, Security Audit"
              />
            </div>
            <div className="field">
              <label className="input-label">GitHub URL</label>
              <input 
                className="input" 
                type="url"
                value={profileForm.github_url}
                onChange={(e) => setProfileForm({...profileForm, github_url: e.target.value})}
                placeholder="https://github.com/username"
              />
            </div>
            <button className="btn btn-primary btn-lg" type="submit" disabled={updating}>
              {updating ? 'Securing Identity...' : 'Update Verified Profile'}
            </button>
          </form>
        </div>
      ) : (
        <>

      {/* Stats Grid */}
      <div className={styles.statsGrid}>
        <StatCard label="Total Settlements" value={stats.earned.toFixed(1)} unit="ALGO" />
        <StatCard label="Escrow Volume" value={stats.locked.toFixed(1)} unit="ALGO" />
        <StatCard label="Reputation Score" value={stats.reputation.toFixed(0)} unit="pts" />
        <StatCard label="Active Tasks" value={bounties.filter(b => b.status === 'active').length.toString()} unit="live" />
      </div>

      {/* Recent Settlements */}
      {activeTab === 'overview' && myWork.length > 0 && (
        <div className="section" style={{ marginBottom: 'var(--space-xl)' }}>
          <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={16} /> Recent Settlement Activity
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {myWork.slice(0, 5).map((sub) => (
              <Link
                key={sub.id}
                href={`/bounties/${sub.bounty_id}`}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '14px 20px', background: 'var(--bg-card)', border: '1px solid var(--border-color)',
                  textDecoration: 'none', color: 'var(--text-primary)',
                  transition: 'border-color var(--transition-fast)',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {sub.status === 'passed' ? (
                    <CheckCircle size={16} color="var(--accent-primary)" />
                  ) : sub.status === 'failed' ? (
                    <XCircle size={16} color="var(--danger)" />
                  ) : (
                    <Activity size={16} color="var(--accent-warning)" />
                  )}
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                      {sub.bounty_title}
                    </div>
                    <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                      ID: {sub.bounty_id.slice(0, 8)}... · {new Date(sub.submitted_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ textAlign: 'right', marginRight: '8px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {sub.reward_algo} <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>ALGO</span>
                    </div>
                  </div>
                  <span className={`badge badge-${sub.status}`} style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>
                    {sub.status}
                  </span>
                  {sub.tx_id && (
                    <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)' }}>
                      TX: {sub.tx_id.slice(0, 8)}...
                    </span>
                  )}
                  <ArrowRight size={14} style={{ color: 'var(--text-tertiary)' }} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-2">
        {/* My Posted Bounties (Buyer) */}
        {role === 'buyer' && myBounties.length > 0 && (
          <div className="section">
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={16} /> My Posted Bounties
            </h3>
            <div className={styles.bountyList}>
              {myBounties.map((b) => (
                <Link key={b.id} href={`/bounties/${b.id}`} className={styles.bountyRow}>
                  <div className={styles.bountyInfo}>
                    <span className={styles.bountyTitle}>{b.title}</span>
                    <span className={`badge badge-${b.status}`} style={{ fontSize: '0.6rem', marginLeft: '8px' }}>{b.status}</span>
                  </div>
                  <div className={styles.bountyMeta}>
                    <span className={styles.bountyReward}>
                      {b.reward_algo} <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>ALGO</span>
                    </span>
                    <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                      {b.submission_count || 0} subs
                    </span>
                    <ArrowRight size={14} style={{ color: 'var(--text-tertiary)' }} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Available Tasks / Opportunity Feed */}
        <div className="section">
          <h3 className="section-title">
            {role === 'seller' ? 'Available Tasks' : 'Verified Opportunity Feed'}
          </h3>
          {loading ? (
             <div className="card">Loading...</div>
          ) : (
            <div className={styles.bountyList}>
              {bounties.map((b) => (
                <Link key={b.id} href={`/bounties/${b.id}`} className={styles.bountyRow}>
                  <div className={styles.bountyInfo}>
                    <span className={styles.bountyTitle}>{b.title}</span>
                  </div>
                  <div className={styles.bountyMeta}>
                    <span className={styles.bountyReward}>
                      {b.reward_algo} <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>ALGO</span>
                    </span>
                    <ArrowRight size={14} style={{ color: 'var(--text-tertiary)' }} />
                  </div>
                </Link>
              ))}
              <Link href="/bounties" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', marginTop: '12px' }}>
                View Full Marketplace <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>

        {/* System & Health */}
        <div className="section">
          <h3 className="section-title">Protocol Integrity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
             <StatusCard
              icon={<Server size={18} />}
              label="Algorand Mainnet / Testnet"
              status={health?.algorand || 'unknown'}
            />
            <StatusCard
              icon={<Cpu size={18} />}
              label="Verification Sandbox (Docker)"
              status={health?.docker || 'unknown'}
            />
            <StatusCard
              icon={<Shield size={18} />}
              label="Consensus Oracle (3 Nodes)"
              status={health?.oracle_nodes?.length === 3 ? 'ready' : 'offline'}
            />
            <div className="card" style={{ padding: '16px', background: 'var(--bg-tertiary)', borderColor: 'var(--accent-info)' }}>
               <p style={{ fontSize: '0.8125rem', color: 'var(--accent-secondary)' }}>
                 <strong>Pro Tip:</strong> Reputation scores above 500 unlock "Elite Shield" status, reducing escrow fees by 15%.
               </p>
            </div>
          </div>
        </div>
      </div></>)}
      {/* Welcome Onboarding Modal */}
      {showWelcome && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modal} card`} style={{ padding: '40px', maxWidth: '500px', textAlign: 'center' }}>
            <div style={{ background: 'rgba(0, 208, 255, 0.1)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <UserIcon size={32} color="var(--accent-primary)" />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '12px' }}>Initialize Identity</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '0.9rem' }}>
              Welcome to VORTEX. To solve bounties or post tasks, you must first establish your professional persona.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
              <div>
                <label className="input-label">Operational Tagline</label>
                <input 
                  className="input" 
                  value={profileForm.tagline}
                  onChange={(e) => setProfileForm({...profileForm, tagline: e.target.value})}
                  placeholder="e.g. Senior Smart Contract Auditor"
                />
              </div>
              <div>
                <label className="input-label">Brief Bio</label>
                <textarea 
                  className="textarea" 
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({...profileForm, bio: e.target.value})}
                  placeholder="Your mission and expertise..."
                  style={{ minHeight: '100px' }}
                />
              </div>
              <button 
                className="btn btn-primary btn-lg" 
                style={{ width: '100%', marginTop: '8px' }}
                onClick={async () => {
                  if (!profileForm.tagline) {
                    toast.error('Tagline is required for identity initialization');
                    return;
                  }
                  await handleUpdateProfile(new Event('submit') as any);
                  setShowWelcome(false);
                }}
                disabled={updating}
              >
                {updating ? 'Synchronizing...' : 'Commit Persona & Enter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className={styles.statCard}>
      <span className={styles.statLabel}>{label}</span>
      <div className={styles.statValue}>
        {value}<span className={styles.statUnit}>{unit}</span>
      </div>
    </div>
  );
}

function StatusCard({ icon, label, status }: {
  icon: React.ReactNode;
  label: string;
  status: string;
}) {
  const ok = status === 'connected' || status === 'ready';
  return (
    <div className={styles.statusCard}>
      <div className={styles.statusIcon} style={{ color: ok ? 'var(--accent-primary)' : 'var(--text-tertiary)' }}>{icon}</div>
      <div className={styles.statusInfo}>
        <span className={styles.statusLabel}>{label}</span>
        <span className={styles.statusValue}>{ok ? 'Secure & Connected' : 'System Degraded'}</span>
      </div>
      <div className={`${styles.statusDot} ${ok ? styles.dotOk : styles.dotErr}`} />
    </div>
  );
}
