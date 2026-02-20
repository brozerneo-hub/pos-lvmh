export enum UserRole {
  CASHIER = 'CASHIER',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  MOBILE = 'MOBILE',
  MIXED = 'MIXED',
}

export enum SaleStatus {
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED',
  PENDING_SYNC = 'PENDING_SYNC',
}

export enum ProductCategory {
  WATCHES = 'WATCHES',
  CLOTHING = 'CLOTHING',
  PERFUME = 'PERFUME',
}

export enum StockMovementType {
  IN = 'IN',
  OUT = 'OUT',
  TRANSFER = 'TRANSFER',
  ADJUSTMENT = 'ADJUSTMENT',
  RETURN = 'RETURN',
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.CASHIER]: 1,
  [UserRole.MANAGER]: 2,
  [UserRole.ADMIN]: 3,
};

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes
export const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_TTL = '8h';
export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;
export const LOW_STOCK_THRESHOLD = 5;
