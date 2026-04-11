'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getUserProfile, syncGithub, updateProfile } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';
import { 
  ShieldCheck, Star, Briefcase, ExternalLink, Mail, Shield,
  MapPin, Award, ArrowLeft, Edit3, LayoutGrid, Gavel, X, Check
} from 'lucide-react';
import Link from 'next/link';
import MasteryRadar from '@/components/MasteryRadar';
import MasteryLevelBadge from '@/components/MasteryLevelBadge';
import ExplorerLink from '@/components/ExplorerLink';
import styles from './page.module.css';

interface UserDataEnhanced {
  wallet_address: string;
  role: string;
  tagline?: string;
  bio?: string;
  reputation_score: number;
  total_earned: number;
  total_locked: number;
  total_staked: number;
  skills?: string[];
  portfolio_items?: Array<{ title: string; url: string; type: string }>;
  reviews?: Array<{ id: string; from_wallet: string; rating: number; comment?: string; created_at: string }>;
  verified_mastery?: Record<string, number>;
  github_url?: string;
  created_at?: string;
}

export default function ProfilePage() {
  const { wallet } = useParams();
  const { wallet: myWallet } = useAuthStore();
  const [profile, setProfile] = useState<UserDataEnhanced | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    tagline: '',
    bio: '',
    github_url: '',
    skills: ''
  });
  const isMe = wallet === myWallet;

  useEffect(() => {
    if (wallet) {
      loadProfile(wallet as string);
    }
  }, [wallet]);

  async function loadProfile(addr: string) {
    setLoading(true);
    try {
      const res = await getUserProfile(addr);
      setProfile(res.data);
      setEditForm({
        tagline: res.data.tagline || '',
        bio: res.data.bio || '',
        github_url: res.data.github_url || '',
        skills: (res.data.skills || []).join(', ')
      });
    } catch {
      // offline fallback
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    try {
      setLoading(true);
      await updateProfile({
        ...editForm,
        skills: editForm.skills.split(',').map(s => s.trim()).filter(Boolean)
      });
      setIsEditing(false);
      await loadProfile(wallet as string);
      toast.success('Profile updated');
    } catch (e: any) {
      toast.error(e.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadAudit = async () => {
    if (!profile) return;
    try {
      setLoading(true);
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/governance/profiles/${profile.wallet_address}/audit`);
      const data = await res.json();
      
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VORTEX_AUDIT_${profile.wallet_address.slice(0, 8)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Sovereign Audit Downloaded');
    } catch (e) {
      toast.error('Audit generation failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !profile) return <div className="page-container"><div className="loading-pulse">Retrieving Verified Profile...</div></div>;
  if (!profile) return <div className="page-container">User not found.</div>;

  return (
    <div className="page-container">
      <Link href="/dashboard" className="btn btn-ghost btn-sm" style={{ marginBottom: '20px' }}>
        <ArrowLeft size={14} /> Back to Dashboard
      </Link>

      {/* Profile Header */}
      <div className={styles.profileHeader}>
        <div className={styles.mainInfo}>
          <div className={styles.nameGroup}>
            <div className={styles.avatarCircle}>
              {profile.wallet_address.slice(0, 2)}
            </div>
            <h1>{profile.wallet_address.slice(0, 12)}...</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <div className={styles.tagline}>{profile.tagline || 'Premium VORTEX Partner'}</div>
              <ExplorerLink type="address" id={profile.wallet_address} label="Verify Ledger" />
              {profile.reputation_score >= 4.5 && (
                <span className="badge badge-active" style={{ fontSize: '0.6rem', padding: '2px 8px', background: 'var(--accent-secondary-dim)', color: 'var(--accent-secondary)' }}>
                  <Gavel size={10} style={{ marginRight: '4px' }} /> Certified Arbiter
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {isMe && (
              <button 
                className="btn btn-secondary btn-sm" 
                style={{ borderColor: 'var(--accent-secondary)', color: 'var(--accent-secondary)' }}
                onClick={downloadAudit}
                disabled={loading}
              >
                 <Shield size={14} /> {loading ? 'Processing...' : 'Download Sovereign Audit'}
              </button>
            )}
            {isMe && (
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={async () => {
                   try {
                     await syncGithub();
                     toast.success('Portfolio synced with GitHub');
                     setTimeout(() => window.location.reload(), 1500);
                   } catch (e) {
                     toast.error('Sync failed');
                   }
                }}
              >
                <ShieldCheck size={14} /> Refresh Verified Portfolio
              </button>
            )}
            {isMe ? (
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit3 size={14} /> Edit Profile
              </button>
            ) : (
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => toast.info(`Encryption link for ${profile.wallet_address.slice(0, 8)} not yet established.`)}
              >
                <Mail size={14} /> Contact
              </button>
            )}
          </div>
        </div>

        <div className={styles.statRow}>
          <div className={styles.statCard}>
            <span className={styles.statVal}>{profile.reputation_score.toFixed(1)}/5.0</span>
            <span className={styles.statLabel}>Trust Score</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statVal}>{profile.total_earned.toFixed(0)}</span>
            <span className={styles.statLabel}>Total ALGO Earned</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statVal}>{profile.reviews?.length || 0}</span>
            <span className={styles.statLabel}>Verified Jobs</span>
          </div>
          <Link href={`/profiles/${wallet}/achievements`} className={`${styles.statCard} ${styles.statLink}`}>
            <span className={styles.statVal} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
               <Award size={20} color="var(--accent-primary)" /> {profile.reviews?.length ? profile.reviews.length : 1}
            </span>
            <span className={styles.statLabel}>Achievements</span>
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: 'var(--space-2xl)' }}>
        {/* Sidebar Info */}
        <aside>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}><ShieldCheck size={18} /> Verified Mastery</h3>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: '10px', border: '1px solid var(--border-color)', marginBottom: '12px' }}>
              <MasteryRadar data={profile.verified_mastery || {}} />
            </div>
            
            <h3 className={styles.sectionTitle}><Award size={18} /> Credentials</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {(profile.skills || ['Python', 'Algorand', 'Security']).map((s) => (
                <MasteryLevelBadge key={s} category={s} level={profile.reviews?.length || 1} />
              ))}
            </div>
          </div>

          {profile.github_url && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}><ExternalLink size={18} /> Social</h3>
              <a href={profile.github_url} className="link" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                GitHub Profile <ExternalLink size={12} />
              </a>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <div>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}><Briefcase size={18} /> About</h3>
            <p className={styles.comment}>
              {profile.bio || "This partner hasn't added a bio yet. All work history shown below is verified on-chain via the VORTEX Protocol 2-of-3 Oracle consensus."}
            </p>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}><LayoutGrid size={18} /> Verified Portfolio</h3>
            <div className={styles.portfolioGrid}>
              {(profile.portfolio_items || []).length > 0 ? (
                profile.portfolio_items?.map((item, idx) => (
                  <div key={idx} className={styles.portfolioCard}>
                    <div className={styles.previewPlaceholder}>
                      {item.url && item.type === 'media' ? (
                        <img src={item.url} alt={item.title} className={styles.previewImg} />
                      ) : (
                        <LayoutGrid size={32} style={{ opacity: 0.2 }} />
                      )}
                      
                      <div className={styles.verifiedTag}>
                        <ShieldCheck size={10} /> AI-Jury Verified
                      </div>
                    </div>
                    <div className={styles.cardBody}>
                      <h4>{item.title}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{item.type}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ gridColumn: 'span 3', padding: '40px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                  <p style={{ color: 'var(--text-tertiary)' }}>No verified work items posted yet.</p>
                </div>
              )}
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}><ShieldCheck size={18} /> On-Chain Feedback</h3>
            <div className={styles.reviewsList}>
              {(profile.reviews || []).length > 0 ? (
                profile.reviews?.map((r) => (
                  <div key={r.id} className={styles.reviewItem}>
                    <div className={styles.reviewHeader}>
                      <div className={styles.stars}>
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={14} fill={i < r.rating ? "currentColor" : "none"} strokeWidth={i < r.rating ? 0 : 2} />
                        ))}
                      </div>
                      <span className={styles.reviewer}>{r.from_wallet.slice(0, 8)}...</span>
                    </div>
                    <p className={styles.comment}>{r.comment || 'No comment provided.'}</p>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '8px' }}>
                      Settled on {new Date(r.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                  <p style={{ color: 'var(--text-tertiary)' }}>No peer reviews received yet.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {isEditing && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalTitle}>
              <Edit3 size={20} /> Adjudicate Persona
            </div>

            <div className={styles.formGrid}>
              <div className={styles.modalField}>
                <label>Operational Tagline</label>
                <input 
                  className={styles.modalInput}
                  value={editForm.tagline}
                  onChange={e => setEditForm(p => ({...p, tagline: e.target.value}))}
                  placeholder="e.g., Senior Smart Contract Forensic Specialist"
                />
              </div>

              <div className={styles.modalField}>
                <label>Professional Bio</label>
                <textarea 
                  className={`${styles.modalInput} ${styles.modalTextarea}`}
                  value={editForm.bio}
                  onChange={e => setEditForm(p => ({...p, bio: e.target.value}))}
                  placeholder="Describe your capabilities and on-chain mission history..."
                />
              </div>

              <div className={styles.modalField}>
                <label>GitHub Identifier</label>
                <input 
                  className={styles.modalInput}
                  value={editForm.github_url}
                  onChange={e => setEditForm(p => ({...p, github_url: e.target.value}))}
                  placeholder="https://github.com/username"
                />
              </div>

              <div className={styles.modalField}>
                <label>Core Skills (comma separated)</label>
                <input 
                  className={styles.modalInput}
                  value={editForm.skills}
                  onChange={e => setEditForm(p => ({...p, skills: e.target.value}))}
                  placeholder="Algorand, PyTEAL, Security Audit"
                />
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className="btn btn-ghost" onClick={() => setIsEditing(false)}>
                <X size={14} /> Abort
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                <Check size={14} /> Commit Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
