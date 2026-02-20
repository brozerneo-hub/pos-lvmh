import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ShoppingCart, Receipt, Users, Package, LogOut, Settings } from 'lucide-react';
import { UserRole } from '@pos-lvmh/shared';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/services/api';

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
