import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Receipt,
  Users,
  Package,
  LogOut,
  Settings,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { UserRole } from '@pos-lvmh/shared';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/services/api';
import { usePendingCount, syncPendingSales, useSyncOnReconnect } from '@/offline/syncService';

const NAV = [
  { to: '/', label: 'Caisse', icon: ShoppingCart, end: true, minRole: UserRole.CASHIER },
  { to: '/sales', label: 'Ventes', icon: Receipt, end: false, minRole: UserRole.CASHIER },
  { to: '/clients', label: 'Clients', icon: Users, end: false, minRole: UserRole.CASHIER },
  { to: '/stock', label: 'Stock', icon: Package, end: false, minRole: UserRole.CASHIER },
  {
    to: '/admin/products',
    label: 'Produits',
    icon: Settings,
    end: false,
    minRole: UserRole.MANAGER,
  },
];

export function AppShell() {
  const { user, hasRole, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pendingCount = usePendingCount();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);

  useSyncOnReconnect(queryClient);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  async function handleManualSync() {
    setSyncing(true);
    await syncPendingSales(queryClient);
    setSyncing(false);
  }

  async function handleLogout() {
    try {
      await api.post('/auth/logout');
    } finally {
      clearAuth();
      navigate('/login', { replace: true });
    }
  }

  return (
    <div className="flex h-screen bg-luxury-50">
      {/* Sidebar */}
      <aside className="w-56 bg-sidebar flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-white/10">
          <p className="font-display text-xl text-white tracking-widest">LVMH</p>
          <p className="text-xs text-white/40 mt-0.5 tracking-wider uppercase">Point de vente</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.filter((item) => hasRole(item.minRole)).map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-sidebar-accent/20 text-sidebar-accent font-medium'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Statut réseau */}
        <div className="px-4 py-3 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi size={13} className="text-green-400" />
              ) : (
                <WifiOff size={13} className="text-orange-400" />
              )}
              <span className={`text-xs ${isOnline ? 'text-green-400' : 'text-orange-400'}`}>
                {isOnline ? 'En ligne' : 'Hors ligne'}
              </span>
            </div>
            {pendingCount > 0 && (
              <button
                onClick={handleManualSync}
                disabled={!isOnline || syncing}
                title={`${pendingCount} vente(s) à synchroniser`}
                className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 disabled:opacity-50 transition-colors"
              >
                <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
                {pendingCount}
              </button>
            )}
          </div>
        </div>

        {/* User + Logout */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent/20 flex items-center justify-center">
              <span className="text-sidebar-accent text-xs font-bold">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-medium truncate">{user?.email}</p>
              <p className="text-white/40 text-xs capitalize">{user?.role?.toLowerCase()}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg text-sm transition-colors"
          >
            <LogOut size={15} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
