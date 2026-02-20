import type {
  UserRole,
  PaymentMethod,
  SaleStatus,
  ProductCategory,
  StockMovementType,
} from '../constants/index.js';

// ─── Identifiants ─────────────────────────────────────────────────────────────
export type UserId = string;
export type ProductId = string;
export type SaleId = string;
export type ClientId = string;
export type StoreId = string;

// ─── API ──────────────────────────────────────────────────────────────────────
export type ApiResponse<T> = { data: T; error: null } | { data: null; error: ApiError };

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: UserId;
  email: string;
  displayName: string;
  role: UserRole;
  storeId: StoreId;
}

export interface AuthTokens {
  accessToken: string;
  // refreshToken envoyé en cookie httpOnly
}

// ─── Produit ──────────────────────────────────────────────────────────────────
export interface Product {
  id: ProductId;
  name: string;
  brand: string;
  sku: string;
  ean: string | null;
  category: ProductCategory;
  subcategory: string;
  priceHT: number; // En centimes (129900 = 1299,00€)
  vatRate: number; // 0.20 = 20%
  description: string;
  imageUrl: string | null;
  size: string | null;
  capacity: string | null;
  active: boolean;
  stockLevel: number; // Stock de la boutique courante
  createdAt: string; // ISO 8601
  updatedAt: string;
}

// ─── Panier ───────────────────────────────────────────────────────────────────
export interface CartLine {
  productId: ProductId;
  productName: string;
  productSku: string;
  imageUrl: string | null;
  unitPriceHT: number;
  vatRate: number;
  quantity: number;
  discountAmount: number;
  lineHT: number;
  lineVAT: number;
  lineTTC: number;
}

export interface CartTotals {
  totalHT: number;
  totalVAT: number;
  totalTTC: number;
  totalDiscount: number;
  vatBreakdown: Record<string, { base: number; vat: number }>;
}

// ─── Vente ────────────────────────────────────────────────────────────────────
export interface SaleLine {
  id: string;
  productId: ProductId;
  productName: string;
  productSku: string;
  quantity: number;
  unitPriceHT: number;
  vatRate: number;
  discountAmount: number;
  lineHT: number;
  lineVAT: number;
  lineTTC: number;
}

export interface Sale {
  id: SaleId;
  storeId: StoreId;
  cashierId: UserId;
  clientId: ClientId | null;
  date: string;
  status: SaleStatus;
  totalHT: number;
  totalVAT: number;
  totalTTC: number;
  totalDiscount: number;
  paymentMode: PaymentMethod;
  paymentDetails: PaymentDetails;
  ticketUrl: string | null;
  syncedFromOffline: boolean;
  lines: SaleLine[];
  createdAt: string;
}

export interface PaymentDetails {
  cashAmount?: number;
  cardAmount?: number;
  changeGiven?: number;
  transactionRef?: string;
}

// ─── Client ───────────────────────────────────────────────────────────────────
export interface Client {
  id: ClientId;
  lastName: string;
  firstName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  birthDate: string | null;
  gender: 'M' | 'F' | 'OTHER' | null;
  loyaltyNumber: string | null;
  marketingConsent: boolean;
  stats: {
    totalSpent: number;
    visitCount: number;
    lastVisit: string | null;
  };
  createdAt: string;
}

// ─── Stock ────────────────────────────────────────────────────────────────────
export interface StockMovement {
  id: string;
  storeId: StoreId;
  productId: ProductId;
  type: StockMovementType;
  quantity: number;
  reason: string | null;
  userId: UserId;
  date: string;
  relatedSaleId: SaleId | null;
}

// ─── Store ────────────────────────────────────────────────────────────────────
export interface Store {
  id: StoreId;
  name: string;
  address: string;
  country: string;
  currency: string;
  timezone: string;
  locale: string;
  active: boolean;
}
