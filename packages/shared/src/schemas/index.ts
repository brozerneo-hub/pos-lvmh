import { z } from 'zod';

import { PaymentMethod, ProductCategory } from '../constants/index.js';

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const LoginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe trop court'),
});

export const RefreshSchema = z.object({
  // Le refresh token est dans le cookie httpOnly, pas dans le body
});

// ─── Produits ─────────────────────────────────────────────────────────────────
export const CreateProductSchema = z.object({
  name: z.string().min(1).max(200),
  brand: z.string().min(1).max(100),
  sku: z.string().regex(/^[A-Z0-9-]{3,50}$/, 'SKU invalide (maj, chiffres, tirets)'),
  ean: z.string().length(13).optional().nullable(),
  category: z.nativeEnum(ProductCategory),
  subcategory: z.string().min(1).max(100),
  priceHT: z.number().int().positive('Prix doit être positif'),
  vatRate: z.number().min(0).max(1),
  description: z.string().max(2000).optional().default(''),
  size: z.string().max(50).optional().nullable(),
  capacity: z.string().max(50).optional().nullable(),
});

export const UpdateProductSchema = CreateProductSchema.partial();

export const SearchProductsSchema = z.object({
  q: z.string().max(200).optional(),
  category: z.nativeEnum(ProductCategory).optional(),
  brand: z.string().max(100).optional(),
  inStock: z.coerce.boolean().optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Ventes ───────────────────────────────────────────────────────────────────
export const SaleLineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPriceHT: z.number().int().positive(),
  vatRate: z.number().min(0).max(1),
  discountAmount: z.number().int().min(0).default(0),
});

export const CreateSaleSchema = z.object({
  clientId: z.string().optional().nullable(),
  items: z.array(SaleLineSchema).min(1).max(100),
  paymentMode: z.nativeEnum(PaymentMethod),
  paymentDetails: z.object({
    cashAmount: z.number().int().min(0).optional(),
    cardAmount: z.number().int().min(0).optional(),
    changeGiven: z.number().int().min(0).optional(),
    transactionRef: z.string().optional(),
  }),
  syncedFromOffline: z.boolean().default(false),
  offlineCreatedAt: z.string().datetime().optional().nullable(),
});

export const ListSalesSchema = z.object({
  storeId: z.string().optional(),
  cashierId: z.string().optional(),
  clientId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Clients ──────────────────────────────────────────────────────────────────
export const CreateClientSchema = z.object({
  lastName: z.string().min(1).max(100),
  firstName: z.string().min(1).max(100),
  email: z.string().email().optional().nullable(),
  phone: z
    .string()
    .regex(/^\+?[\d\s-]{7,20}$/)
    .optional()
    .nullable(),
  address: z.string().max(300).optional().nullable(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  gender: z.enum(['M', 'F', 'OTHER']).optional().nullable(),
  loyaltyNumber: z.string().max(50).optional().nullable(),
  marketingConsent: z.boolean().default(false),
});

export const UpdateClientSchema = CreateClientSchema.partial();

export const SearchClientsSchema = z.object({
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Stock ────────────────────────────────────────────────────────────────────
export const AdjustStockSchema = z.object({
  quantity: z.number().int(),
  reason: z.string().min(1).max(500),
});

export const GetMovementsSchema = z.object({
  productId: z.string().optional(),
  type: z.enum(['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT', 'RETURN']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Utilisateurs ─────────────────────────────────────────────────────────────
export const CreateUserSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(2).max(100),
  password: z
    .string()
    .min(12)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/,
      'Mot de passe trop faible (min. 12 cars, maj, min, chiffre, spécial)',
    ),
  role: z.enum(['CASHIER', 'MANAGER', 'ADMIN']),
  storeId: z.string().min(1),
});

// ─── Types inférés ────────────────────────────────────────────────────────────
export type LoginDto = z.infer<typeof LoginSchema>;
export type CreateProductDto = z.infer<typeof CreateProductSchema>;
export type UpdateProductDto = z.infer<typeof UpdateProductSchema>;
export type SearchProductsDto = z.infer<typeof SearchProductsSchema>;
export type CreateSaleDto = z.infer<typeof CreateSaleSchema>;
export type SaleLineDto = z.infer<typeof SaleLineSchema>;
export type ListSalesDto = z.infer<typeof ListSalesSchema>;
export type CreateClientDto = z.infer<typeof CreateClientSchema>;
export type UpdateClientDto = z.infer<typeof UpdateClientSchema>;
export type AdjustStockDto = z.infer<typeof AdjustStockSchema>;
export type CreateUserDto = z.infer<typeof CreateUserSchema>;
