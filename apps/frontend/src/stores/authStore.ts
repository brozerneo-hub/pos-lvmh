import { create } from 'zustand';
import type { UserRole } from '@pos-lvmh/shared';
import { ROLE_HIERARCHY } from '@pos-lvmh/shared';

interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  storeId: string;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
  hasRole: (minRole: UserRole) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,

  setAuth: (accessToken, user) => set({ accessToken, user }),

  clearAuth: () => set({ accessToken: null, user: null }),

  hasRole: (minRole) => {
    const { user } = get();
    if (!user) return false;
    return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[minRole];
  },
}));
