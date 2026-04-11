'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import Navbar from '@/components/Navbar';
import styles from './layout.module.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isConnected, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    // Wait a tick for hydration
    const t = setTimeout(() => {
      const activeRole = localStorage.getItem('vortex_active_role');
      const token = activeRole ? localStorage.getItem(`vortex_token_${activeRole}`) : null;
      if (!token) {
        router.push('/');
      }
    }, 100);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className={styles.layout}>
      <Navbar />
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}
