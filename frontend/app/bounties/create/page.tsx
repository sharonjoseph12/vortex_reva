'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBounty, generateTests, evaluateScope, refineScope } from '@/lib/api';
import { ArrowLeft, Plus, Sparkles, Send, ShieldCheck, Code, ImageIcon, FileText, Scale, Briefcase, Zap, CheckCircle2, Lock, AlertTriangle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import ProfileGate from '@/components/ProfileGate';
import styles from './page.module.css';

export default function CreateBountyPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    description: '',
    requirements: '',
    verification_criteria: '',
    asset_type: 'code',
    reward_algo: '',
    deadline: '',
    difficulty: 'medium',
    category: 'python',
  });
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [refining, setRefining] = useState(false);
  const [error, setError] = useState('');
  
  const [sealStatus, setSealStatus] = useState<'idle' | 'analyzing' | 'passed' | 'failed'>('idle');
  const [sealResult, setSealResult] = useState<any>(null);


  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (['description', 'verification_criteria'].includes(field)) {
      setSealStatus('idle');
      setSealResult(null);
    }
    
    // Auto-update criteria placeholder/logic based on type
    if (field === 'asset_type') {
      if (value === 'media') {
        update('category', 'design');
        if (!form.verification_criteria) update('verification_criteria', '1. Use primary colors #14A800 and #FFFFFF\n2. Modern minimalist style\n3. High resolution PNG export');
      } else if (value === 'document') {
        update('category', 'document');
      } else if (value === 'code') {
        update('category', 'python');
      } else if (value === 'contract') {
        update('category', 'legal');
        if (!form.verification_criteria) update('verification_criteria', '1. Must include arbitration clause\n2. Clear indemnification wording\n3. Compatible with Local Jurisdictions');
      }
    }
  }

  async function handleSeal() {
    if (!form.description || !form.verification_criteria) {
      setError('Provide details and criteria to seal the scope');
      return;
    }
    setSealStatus('analyzing');
    setError('');
    try {
      const res = await evaluateScope(form.description, form.verification_criteria);
      setSealResult(res.data);
      if (res.data.is_sealed) {
        setSealStatus('passed');
      } else {
        setSealStatus('failed');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sealer offline');
      setSealStatus('idle');
    }
  }

  async function handleGenerate() {
    if (!form.description || form.description.length < 20) {
      setError('Provide a detailed description first for AI test generation');
      return;
    }
    setGenerating(true);
    setError('');
    try {
      const res = await generateTests(form.description, form.category);
      if (res.data.tests) {
        update('verification_criteria', res.data.tests);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate tests');
    } finally {
      setGenerating(false);
    }
  }

  async function handleRefine() {
    if (!form.description) {
      setError('Provide a description to refine');
      return;
    }
    setRefining(true);
    setError('');
    try {
      const res = await refineScope(form.description, form.requirements || form.description);
      setForm(prev => ({
        ...prev,
        description: res.data.refined_description,
        requirements: res.data.refined_requirements
      }));
      setSealStatus('idle');
      setSealResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refinement failed');
    } finally {
      setRefining(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const deadlineDate = new Date(form.deadline).toISOString();
      const res = await createBounty({
        ...form,
        reward_algo: parseFloat(form.reward_algo),
        deadline: deadlineDate,
      });
      router.push(`/bounties/${res.data.bounty_id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create bounty');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ProfileGate>
      <div className="page-container" style={{ maxWidth: '900px' }}>
      <Link href="/bounties" className={styles.backLink}>
        <ArrowLeft size={14} /> Back to Marketplace
      </Link>

      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
          <div style={{ padding: '8px', background: 'var(--accent-primary-dim)', borderRadius: '12px', color: 'var(--accent-primary)' }}>
            <Plus size={24} />
          </div>
          <h1 className="page-title" style={{ margin: 0 }}>Create New Bounty</h1>
        </div>
        <p className="page-subtitle">Define scope, set reward, and deploy escrow contract.</p>
      </div>

      <form onSubmit={handleSubmit} className={styles.formCard}>
        <div className={styles.formBody}>
          {/* Asset Type Selection */}
          <div className={styles.assetSelector}>
            <label className="input-label">What do you need built?</label>
            <div className={styles.typeGrid}>
               <TypeButton 
                active={form.asset_type === 'code'} 
                onClick={() => update('asset_type', 'code')}
                icon={<Code size={18} />}
                label="Software"
              />
              <TypeButton 
                active={form.asset_type === 'media'} 
                onClick={() => update('asset_type', 'media')}
                icon={<ImageIcon size={18} />}
                label="Design"
              />
              <TypeButton 
                active={form.asset_type === 'document'} 
                onClick={() => update('asset_type', 'document')}
                icon={<FileText size={18} />}
                label="Content"
              />
              <TypeButton 
                active={form.asset_type === 'contract'} 
                onClick={() => update('asset_type', 'contract')}
                icon={<Scale size={18} />}
                label="Legal"
              />
              <TypeButton 
                active={form.asset_type === 'general'} 
                onClick={() => update('asset_type', 'general')}
                icon={<Zap size={18} />}
                label="Other"
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="bounty-title" className="input-label">Project Title</label>
            <input
              id="bounty-title"
              name="bounty-title"
              className="input"
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              placeholder="e.g., Responsive Landing Page for Fintech Startup"
              required
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="industry-category" className="input-label">Industry Category</label>
              <select 
                id="industry-category"
                name="industry-category"
                className="select" 
                value={form.category} 
                onChange={(e) => update('category', e.target.value)}
              >
                <optgroup label="Technical">
                  <option value="python">Python Development</option>
                  <option value="javascript">Frontend / JS</option>
                  <option value="rust">Systems / Rust</option>
                  <option value="ai_ml">AI / Machine Learning</option>
                </optgroup>
                <optgroup label="Professional">
                  <option value="design">Graphic Design</option>
                  <option value="marketing">Digital Marketing</option>
                  <option value="video">Motion & Video</option>
                  <option value="translation">Translation</option>
                </optgroup>
                <optgroup label="Business">
                  <option value="document">Technical Writing</option>
                  <option value="legal">Legal & Contracts</option>
                  <option value="admin">Admin Support</option>
                  <option value="other">Other Operations</option>
                </optgroup>
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="estimated-difficulty" className="input-label">Estimated Difficulty</label>
              <select id="estimated-difficulty" name="estimated-difficulty" className="select" value={form.difficulty} onChange={(e) => update('difficulty', e.target.value)}>
                <option value="easy">Easy (Quick Task)</option>
                <option value="medium">Medium (Standard)</option>
                <option value="hard">Hard (Complex Architecture)</option>
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="detailed-brief" className="input-label">Detailed Brief & Context</label>
            <textarea
              id="detailed-brief"
              name="detailed-brief"
              className="textarea"
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Describe the final outcome you expect..."
              required
              style={{ minHeight: '160px' }}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="reward-algo" className="input-label">Reward (ALGO)</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="reward-algo"
                  name="reward-algo"
                  className="input"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={form.reward_algo}
                  onChange={(e) => update('reward_algo', e.target.value)}
                  placeholder="50.0"
                  required
                  style={{ paddingRight: '60px' }}
                />
                <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>ALGO</span>
              </div>
            </div>
            <div className={styles.field}>
              <label htmlFor="bounty-deadline" className="input-label">Deadline</label>
              <input
                id="bounty-deadline"
                name="bounty-deadline"
                className="input"
                type="datetime-local"
                value={form.deadline}
                onChange={(e) => update('deadline', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Verification Logic */}
          <div className={styles.verificationSection}>
            <div className={styles.fieldHeader}>
              <label htmlFor="verification-criteria" className="input-label" style={{ marginBottom: 0 }}>
                {form.asset_type === 'code' ? 'Verification Tests (Pytest)' : 'Evaluation Criteria (AI Vision/RAG)'}
              </label>
              {form.asset_type === 'code' ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  <Sparkles size={12} />
                  {generating ? 'Drafting...' : 'AI Generate Tests'}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  <Sparkles size={12} />
                  {generating ? 'Drafting...' : 'AI Generate Criteria'}
                </button>
              )}
            </div>
            <textarea
              id="verification-criteria"
              name="verification-criteria"
              className="textarea"
              value={form.verification_criteria}
              onChange={(e) => update('verification_criteria', e.target.value)}
              placeholder={form.asset_type === 'code' 
                ? "def test_solution():\n    assert result == expected"
                : "List specific design rules or content requirements for the AI to check..."
              }
              required
              style={{ 
                minHeight: '200px', 
                fontFamily: form.asset_type === 'code' ? 'var(--font-mono)' : 'inherit',
                background: 'var(--bg-secondary)',
                fontSize: '0.875rem'
              }}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={12} /> Funds are locked in escrow and only released if these criteria are met.
            </p>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          {/* AI Sovereign Guardrails */}
          <div className={styles.guardrailBox}>
             {sealStatus === 'idle' && (
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div>
                   <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><Lock size={16} color="var(--text-secondary)" /> Seal Bounty Scope</h4>
                   <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>AI verification is required to prevent disputes before deployment.</p>
                 </div>
                 <button type="button" className="btn btn-secondary" onClick={handleSeal} disabled={!form.description || !form.verification_criteria}>
                   Analyze & Seal
                 </button>
               </div>
             )}

             {sealStatus === 'analyzing' && (
               <div style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <div className="spinner" style={{ width: '16px', height: '16px' }} /> Analyzing subjectivity...
               </div>
             )}

             {sealStatus === 'failed' && sealResult && (
               <div style={{ background: 'rgba(255, 68, 68, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,68,68,0.3)' }}>
                 <h4 style={{ margin: '0 0 12px 0', color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <AlertTriangle size={18} /> Sealer Rejection: Ambiguity Detected
                 </h4>
                 <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                   {sealResult.flags?.map((f: any, i: number) => (
                     <li key={i}><strong>{f.type.toUpperCase()}:</strong> {f.issue}</li>
                   ))}
                 </ul>
                 <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleRefine} disabled={refining}>
                      <RefreshCw size={12} className={refining ? 'spinner' : ''} />
                      {refining ? 'Optimizing...' : 'Surgically Refine with VORTEX AI'}
                    </button>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', flex: 1 }}>
                      Protocol detects ambiguity. AI Refiner can objective-ify your scope to pass the guardrails.
                    </div>
                  </div>
               </div>
             )}

             {sealStatus === 'passed' && sealResult && (
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(20, 168, 0, 0.1)', border: '1px solid var(--accent-primary)', borderRadius: '8px' }}>
                 <div>
                   <h4 style={{ margin: 0, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <CheckCircle2 size={18} /> Scope Sealed (Score: {sealResult.score}/100)
                   </h4>
                   <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Protocol verifies this task is objectively adjudicatable.</p>
                 </div>
                 <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    <Send size={16} />
                    {submitting ? 'Deploying...' : 'Deploy Smart Contract & Lock'}
                  </button>
               </div>
             )}
          </div>
        </div>
      </form>
    </div>
    </ProfileGate>
  );
}

function TypeButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      className={`${styles.typeBtn} ${active ? styles.typeBtnActive : ''}`}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
      {active && <div className={styles.activeDot} />}
    </button>
  );
}
