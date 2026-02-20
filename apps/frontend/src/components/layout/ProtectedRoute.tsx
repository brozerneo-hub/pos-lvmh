import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { UserRole, ROLE_HIERARCHY } from '@pos-lvmh/shared';

interface ProtectedRouteProps {
  children: ReactNode;
  minRole?: UserRole;
}

// TODO Sprint 1 : connecter au store d'authentification Zustand
export function ProtectedRoute({ children, minRole = UserRole.CASHIER }: ProtectedRouteProps) {
  // Placeholder — remplacé en Sprint 1 avec useAuthStore
  const isAuthenticated = false;
  const userRole: UserRole | null = null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (userRole && ROLE_HIERARCHY[userRole] < ROLE_HIERARCHY[minRole]) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
