'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import Navbar from '@/components/Navbar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
    const t = setTimeout(() => {
      const activeRole = localStorage.getItem('vortex_active_role');
      const token = activeRole ? localStorage.getItem(`vortex_token_${activeRole}`) : null;
      if (!token) router.push('/');
    }, 100);
    return () => clearTimeout(t);
  }, [hydrate, router]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1, marginLeft: 'var(--sidebar-width)', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
        {children}
      </main>
    </div>
  );
}
