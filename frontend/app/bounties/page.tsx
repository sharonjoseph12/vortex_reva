'use client';

import { useEffect, useState } from 'react';
import { listBounties, type BountyData } from '@/lib/api';
import BountyCard from '@/components/BountyCard';
import { Target, Search, Filter, Sparkles, SlidersHorizontal } from 'lucide-react';
import styles from './page.module.css';

export default function BountiesPage() {
  const [bounties, setBounties] = useState<BountyData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'active',
    difficulty: '',
    category: '',
    sort: 'newest',
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    load();
  }, [filters]);

  async function load() {
    setLoading(true);
    try {
      const res = await listBounties({
        ...filters,
        limit: 20,
      });
      setBounties(res.data.bounties);
      setTotal(res.data.total);
    } catch {
      // Offline fallback
    } finally {
      setLoading(false);
    }
  }

  const filteredBounties = bounties.filter(b => 
    b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '8px', background: 'var(--accent-primary)', borderRadius: '10px', color: '#FFF' }}>
            <Target size={24} />
          </div>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>Discover Bounties</h1>
            <p className="page-subtitle">Premium opportunities verified by Algorand consensus.</p>
          </div>
        </div>
      </div>

      {/* Modern Filter Desktop */}
      <div className={styles.filterBar}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input 
            className={`input ${styles.searchInput}`} 
            placeholder="Search tasks, categories, or tech stack..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
             <SlidersHorizontal size={14} style={{ color: 'var(--text-tertiary)' }} />
             <select
              className="select"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              style={{ width: '160px' }}
            >
              <option value="">All Categories</option>
              <option value="python">Software</option>
              <option value="design">Design</option>
              <option value="document">Documentation</option>
              <option value="marketing">Marketing</option>
            </select>
          </div>

          <select
            className="select"
            value={filters.difficulty}
            onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
            style={{ width: '140px' }}
          >
            <option value="">Difficulty</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Expert</option>
          </select>

          <select
            className="select"
            value={filters.sort}
            onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
            style={{ width: '140px' }}
          >
            <option value="newest">Recent</option>
            <option value="reward">Highest Reward</option>
            <option value="deadline">Near Deadline</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className={styles.loadingGrid}>
          {[1,2,3,4,5,6].map(i => <div key={i} className={styles.skeletonCard} />)}
        </div>
      ) : filteredBounties.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '100px 0' }}>
          <Sparkles size={48} style={{ color: 'var(--accent-primary-dim)', marginBottom: '24px' }} />
          <h3 className="page-title">No matching bounties</h3>
          <p className="page-subtitle">Try adjusting your filters or search keywords.</p>
          <button className="btn btn-secondary btn-md" style={{ marginTop: '24px' }} onClick={() => {
            setFilters({ status: 'active', difficulty: '', category: '', sort: 'newest' });
            setSearchTerm('');
          }}>Reset Filters</button>
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredBounties.map((b) => (
            <BountyCard key={b.id} bounty={b} />
          ))}
        </div>
      )}
    </div>
  );
}
