import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { UserRole } from '@pos-lvmh/shared';
import { useAuthStore } from '@/stores/authStore';

interface Props {
  children: ReactNode;
  minRole?: UserRole;
}

export function ProtectedRoute({ children, minRole }: Props) {
  const { user, hasRole } = useAuthStore();

  if (!user) return <Navigate to="/login" replace />;
  if (minRole && !hasRole(minRole)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
