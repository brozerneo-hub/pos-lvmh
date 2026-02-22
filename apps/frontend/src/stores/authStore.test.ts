import { beforeEach, describe, expect, it } from 'vitest';

import { UserRole } from '@pos-lvmh/shared';

import { useAuthStore } from './authStore';

const CASHIER: Parameters<ReturnType<typeof useAuthStore.getState>['setAuth']>[1] = {
  id: 'user-1',
  email: 'caissier@lvmh.com',
  firstName: 'Alice',
  lastName: 'Dupont',
  role: UserRole.CASHIER,
  storeId: 'store-paris',
};

const MANAGER = { ...CASHIER, id: 'user-2', email: 'manager@lvmh.com', role: UserRole.MANAGER };
const ADMIN = { ...CASHIER, id: 'user-3', email: 'admin@lvmh.com', role: UserRole.ADMIN };

beforeEach(() => {
  useAuthStore.setState({ accessToken: null, user: null });
});

describe('etat initial', () => {
  it('accessToken est null', () => {
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('user est null', () => {
    expect(useAuthStore.getState().user).toBeNull();
  });
});

describe('setAuth', () => {
  it('enregistre le token et le user', () => {
    useAuthStore.getState().setAuth('tok-abc', CASHIER);
    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('tok-abc');
    expect(state.user).toEqual(CASHIER);
  });

  it('ecrase une session existante', () => {
    useAuthStore.getState().setAuth('tok-old', CASHIER);
    useAuthStore.getState().setAuth('tok-new', MANAGER);
    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('tok-new');
    expect(state.user?.role).toBe(UserRole.MANAGER);
  });
});

describe('clearAuth', () => {
  it('remet accessToken et user a null', () => {
    useAuthStore.getState().setAuth('tok-abc', CASHIER);
    useAuthStore.getState().clearAuth();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('fonctionne sans session prealable', () => {
    useAuthStore.getState().clearAuth();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});

describe('hasRole', () => {
  it('retourne false si aucun user connecte', () => {
    expect(useAuthStore.getState().hasRole(UserRole.CASHIER)).toBe(false);
  });

  describe('CASHIER', () => {
    beforeEach(() => {
      useAuthStore.getState().setAuth('tok', CASHIER);
    });
    it('a le role CASHIER', () => {
      expect(useAuthStore.getState().hasRole(UserRole.CASHIER)).toBe(true);
    });
    it("n'a pas le role MANAGER", () => {
      expect(useAuthStore.getState().hasRole(UserRole.MANAGER)).toBe(false);
    });
    it("n'a pas le role ADMIN", () => {
      expect(useAuthStore.getState().hasRole(UserRole.ADMIN)).toBe(false);
    });
  });

  describe('MANAGER', () => {
    beforeEach(() => {
      useAuthStore.getState().setAuth('tok', MANAGER);
    });
    it('a le role CASHIER', () => {
      expect(useAuthStore.getState().hasRole(UserRole.CASHIER)).toBe(true);
    });
    it('a le role MANAGER', () => {
      expect(useAuthStore.getState().hasRole(UserRole.MANAGER)).toBe(true);
    });
    it("n'a pas le role ADMIN", () => {
      expect(useAuthStore.getState().hasRole(UserRole.ADMIN)).toBe(false);
    });
  });

  describe('ADMIN', () => {
    beforeEach(() => {
      useAuthStore.getState().setAuth('tok', ADMIN);
    });
    it('a le role CASHIER', () => {
      expect(useAuthStore.getState().hasRole(UserRole.CASHIER)).toBe(true);
    });
    it('a le role MANAGER', () => {
      expect(useAuthStore.getState().hasRole(UserRole.MANAGER)).toBe(true);
    });
    it('a le role ADMIN', () => {
      expect(useAuthStore.getState().hasRole(UserRole.ADMIN)).toBe(true);
    });
  });
});
