'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { getMe, updateProfile } from '@/lib/api';
import { User, Zap, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

/**
 * ProfileGate wraps pages that require a completed profile.
 * If the user hasn't set a tagline, shows an inline setup form.
 */
export default function ProfileGate({ children }: { children: React.ReactNode }) {
  const { wallet, token } = useAuthStore();
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ tagline: '', bio: '', skills: '' });

  useEffect(() => {
    if (!wallet || !token) {
      setProfileComplete(null);
      return;
    }

    async function check() {
      try {
        const res = await getMe();
        // Profile is complete if tagline is set
        setProfileComplete(!!res.data.tagline);
        if (res.data.tagline) {
          setForm({
            tagline: res.data.tagline || '',
            bio: res.data.bio || '',
            skills: (res.data.skills || []).join(', '),
          });
        }
      } catch {
        // If we can't fetch, let them through (backend might be down)
        setProfileComplete(true);
      }
    }
    check();
  }, [wallet, token]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.tagline.trim()) return;
    setSaving(true);
    try {
      await updateProfile({
        tagline: form.tagline.trim(),
        bio: form.bio.trim() || undefined,
        skills: form.skills ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      });
      setProfileComplete(true);
      toast.success('Profile activated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  // Still loading
  if (profileComplete === null) return <>{children}</>;

  // Profile complete — render children
  if (profileComplete) return <>{children}</>;

  // Profile incomplete — show inline setup
  return (
    <div className="page-container" style={{ maxWidth: '800px', margin: '40px auto' }}>
      <div style={{
        padding: '60px',
        border: '1px solid var(--accent-primary)',
        background: 'linear-gradient(135deg, rgba(3, 8, 13, 0.95) 0%, rgba(3, 8, 13, 1) 100%)',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '24px',
        boxShadow: '0 40px 100px rgba(0,0,0,0.6)'
      }}>
        {/* Cinematic Background Artifacts */}
        <div style={{
           position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none',
           backgroundImage: 'radial-gradient(var(--accent-primary) 0.5px, transparent 0.5px)',
           backgroundSize: '20px 20px'
        }} />
        
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
          background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary), transparent)',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '40px' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '16px',
              background: 'rgba(0,208,255,0.1)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(0, 208, 255, 0.2)',
              boxShadow: '0 0 20px rgba(0,208,255,0.2)'
            }}>
              <User size={32} color="var(--accent-primary)" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: 'white', letterSpacing: '-0.03em' }}>
                Identity Initialization
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Protocol Secure Gating Activated
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
              <div>
                <label htmlFor="tagline" className="input-label" style={{ marginBottom: '10px', display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800 }}>
                  Forensic Tagline <span style={{ color: 'var(--accent-primary)' }}>*</span>
                </label>
                <input
                  id="tagline"
                  name="tagline"
                  className="input"
                  style={{ background: 'rgba(255,255,255,0.03)', fontSize: '1.1rem', padding: '16px' }}
                  value={form.tagline}
                  onChange={e => setForm({ ...form, tagline: e.target.value })}
                  placeholder="e.g. AI-Validation Architect | Rust Systems Auditor"
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <label htmlFor="skills" className="input-label" style={{ marginBottom: '10px', display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800 }}>
                    Skill Nodes
                  </label>
                  <input
                    id="skills"
                    name="skills"
                    className="input"
                    style={{ background: 'rgba(255,255,255,0.03)', padding: '12px' }}
                    value={form.skills}
                    onChange={e => setForm({ ...form, skills: e.target.value })}
                    placeholder="Python, Security, React..."
                  />
                </div>
                <div>
                   <label className="input-label" style={{ marginBottom: '10px', display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800 }}>
                      Operational Readiness
                   </label>
                   <div style={{ height: '48px', display: 'flex', alignItems: 'center', background: 'rgba(20, 168, 0, 0.05)', border: '1px solid rgba(20, 168, 0, 0.2)', borderRadius: '8px', padding: '0 16px', color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: 700 }}>
                      TRUST NODE: VERIFIED
                   </div>
                </div>
              </div>

              <div>
                <label htmlFor="bio" className="input-label" style={{ marginBottom: '10px', display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800 }}>
                  Mission Bio
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  className="textarea"
                  style={{ background: 'rgba(255,255,255,0.03)', minHeight: '100px', padding: '16px' }}
                  value={form.bio}
                  onChange={e => setForm({ ...form, bio: e.target.value })}
                  placeholder="Summarize your professional mastery for the Sovereign Hub..."
                />
              </div>
            </div>

            <button
              className="btn btn-primary"
              type="submit"
              disabled={saving || !form.tagline.trim()}
              style={{ padding: '18px', fontSize: '1rem', marginTop: '12px', boxShadow: '0 10px 30px rgba(0, 208, 255, 0.3)' }}
            >
              <Zap size={20} />
              {saving ? 'INITIALIZING...' : 'ESTABLISH SOVEREIGN IDENTITY'}
              <ArrowRight size={18} />
            </button>
            <p style={{ margin: 0, textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Identity will be immutably linked to wallet node {wallet?.slice(0, 10)}...
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
