'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { disconnectWallet } from '@/lib/wallet';
import { 
  Zap, Bell, Gavel, LayoutDashboard, 
  Search, Shield, User, LogOut, Menu,
  BarChart3, Award, DollarSign, Server,
  Plus, Briefcase, Activity, AlertTriangle
} from 'lucide-react';
import styles from './Navbar.module.css';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { wallet, role, logout, sessions, switchRole } = useAuthStore();
  const [scrolled, setScrolled] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; type: string; title: string; time: string; icon: any }>>([
    { id: '1', type: 'system', title: 'System Ready: VORTEX consensus oracles are now fully operational.', time: 'Just now', icon: Shield }
  ]);

  const handleLogout = async () => {
    await disconnectWallet();
    router.push('/');
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!wallet) return;

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const es = new EventSource(`${API_URL}/protocol/pulse`);

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        const newNotif = {
          id: Math.random().toString(36).substr(2, 9),
          type: event.event,
          title: event.message || `${event.event.replace(/_/g, ' ')} detected in protocol.`,
          time: 'Just now',
          icon: event.event.includes('DISPUTE') ? AlertTriangle : Zap
        };
        setNotifications(prev => [newNotif, ...prev].slice(0, 10));
      } catch (err) {
        console.error("SSE parse error", err);
      }
    };

    return () => es.close();
  }, [wallet]);

  // Don't show complex nav on landing page if not logged in
  const isLanding = pathname === '/';
  if (isLanding && !wallet) return null;

  return (
    <nav className={`${styles.navbar} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.container}>
        <div className={styles.left}>
          <Link href="/" className={styles.logo}>
            <div className={styles.logoIcon}><Zap size={18} fill="currentColor" /></div>
            <span>VORTEX</span>
          </Link>

          <div className={styles.navLinks}>
            <NavLink href="/dashboard" icon={<LayoutDashboard size={16} />} label="Overview" active={pathname === '/dashboard'} />
            <NavLink href="/bounties" icon={<Search size={16} />} label="Marketplace" active={pathname.startsWith('/bounties')} />
            <NavLink href="/governance" icon={<Gavel size={16} />} label="DAO" active={pathname === '/governance'} />
            <NavLink href="/protocol/pulse" icon={<Activity size={16} />} label="Global Pulse" active={pathname.startsWith('/protocol/pulse')} />
            <NavLink href="/system/oracle" icon={<Server size={16} />} label="System" active={pathname.startsWith('/system/oracle')} />
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.actions}>
            {/* Persona Switcher */}
            <div className={styles.personaToggle}>
              <button 
                className={`${styles.personaBtn} ${role === 'buyer' ? styles.personaActive : ''}`}
                onClick={() => switchRole('buyer')}
                disabled={!sessions.buyer}
                title={sessions.buyer ? "Switch to Buyer Persona" : "Buyer role not connected"}
              >
                <Shield size={16} />
                <span className={styles.personaLabel}>Hire</span>
              </button>
              <button 
                className={`${styles.personaBtn} ${role === 'seller' ? styles.personaActive : ''}`}
                onClick={() => switchRole('seller')}
                disabled={!sessions.seller}
                title={sessions.seller ? "Switch to Solver Persona" : "Solver role not connected"}
              >
                <Briefcase size={16} />
                <span className={styles.personaLabel}>Solve</span>
              </button>
              
              {(!sessions.buyer || !sessions.seller) && (
                <Link href="/" className={styles.addPersona} title="Add another role session">
                  <Plus size={14} />
                </Link>
              )}
            </div>

            <button className={styles.actionBtn} onClick={() => setNotifOpen(!notifOpen)}>
              <Bell size={20} />
              {notifications.length > 0 && <div className={styles.badge} />}
            </button>
            <Link href={wallet ? `/profiles/${wallet}` : '#'} className={styles.profileBtn}>
              <div className={styles.avatar}>
                {wallet ? wallet.slice(0, 2).toUpperCase() : <User size={16} />}
              </div>
            </Link>
            <button className={styles.logoutBtn} onClick={handleLogout} title="Emergency Logout">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {notifOpen && (
        <div className={styles.notifDropdown}>
          <div className={styles.notifHeader}>
            <span>Security Feed</span>
            <button onClick={() => setNotifOpen(false)}>Clear</button>
          </div>
          <div className={styles.notifList}>
            {notifications.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                No active security alerts.
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={styles.notifItem}>
                  <div className={styles.notifIcon}><n.icon size={14} /></div>
                  <div className={styles.notifContent}>
                    <p>{n.title}</p>
                    <span>{n.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

function NavLink({ href, icon, label, active, id }: { href: string; icon: React.ReactNode; label: string; active: boolean; id?: string }) {
  return (
    <Link id={id} href={href} className={`${styles.navLink} ${active ? styles.navLinkActive : ''}`}>
      {icon}
      <span>{label}</span>
    </Link>
  );
}
