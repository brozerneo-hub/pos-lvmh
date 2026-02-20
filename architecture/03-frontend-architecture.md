# Architecture Frontend — POS LVMH

**Version** : 1.0 | **Date** : 2026-02-20 | **Expert Frontend**

---

## 1. Structure Complète des Répertoires

```
apps/frontend/src/
├── components/                    # Composants réutilisables
│   ├── ui/                        # shadcn/ui (Button, Input, Dialog, Badge…)
│   ├── layout/
│   │   ├── AppShell.tsx           # Layout principal (sidebar + header + outlet)
│   │   ├── Navbar.tsx             # Barre supérieure (boutique, utilisateur, statut réseau)
│   │   ├── Sidebar.tsx            # Navigation latérale par rôle
│   │   └── ProtectedRoute.tsx     # Guard d'accès par rôle
│   └── shared/
│       ├── OfflineBanner.tsx      # Bandeau online/offline/syncing
│       ├── LoadingSpinner.tsx
│       ├── ErrorBoundary.tsx
│       ├── ConfirmDialog.tsx
│       ├── DataTable.tsx          # Tableau générique paginé
│       └── StatusBadge.tsx
│
├── features/
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   ├── LoginForm.tsx
│   │   └── useLoginMutation.ts
│   │
│   ├── catalog/
│   │   ├── CatalogPanel.tsx       # Panneau gauche de la caisse
│   │   ├── ProductGrid.tsx        # Grille de produits (responsive)
│   │   ├── ProductCard.tsx        # Carte produit cliquable
│   │   ├── ProductListItem.tsx    # Vue liste alternative
│   │   ├── ProductDetail.tsx      # Modal détail produit
│   │   ├── SearchBar.tsx          # Input + debounce
│   │   ├── BarcodeScanner.tsx     # html5-qrcode wrapper
│   │   ├── CategoryFilter.tsx     # Chips de filtrage
│   │   └── StockIndicator.tsx     # Badge vert/orange/rouge
│   │
│   ├── cart/
│   │   ├── CartPanel.tsx          # Panneau droit de la caisse
│   │   ├── CartItem.tsx           # Ligne panier (image, nom, qty, prix)
│   │   ├── CartSummary.tsx        # Totaux HT / TVA / TTC
│   │   ├── DiscountInput.tsx      # Champ remise manuelle
│   │   └── EmptyCart.tsx          # État panier vide
│   │
│   ├── checkout/
│   │   ├── CheckoutModal.tsx      # Modal de paiement multi-étapes
│   │   ├── PaymentSelector.tsx    # CB / Espèces / Mixte
│   │   ├── CashPayment.tsx        # Calcul rendu monnaie
│   │   ├── ReceiptPreview.tsx     # Aperçu ticket PDF
│   │   └── useCreateSale.ts       # Mutation React Query
│   │
│   ├── clients/
│   │   ├── ClientSelector.tsx     # Recherche + association pendant checkout
│   │   ├── ClientQuickCreate.tsx  # Modal création rapide inline
│   │   ├── ClientsPage.tsx
│   │   ├── ClientCard.tsx
│   │   ├── ClientDetail.tsx       # Fiche client + historique achats
│   │   └── ClientForm.tsx
│   │
│   ├── sales/
│   │   ├── SalesHistoryPage.tsx
│   │   ├── SaleRow.tsx
│   │   ├── SaleDetail.tsx         # Modal détail vente
│   │   └── SalesFilters.tsx       # Filtres date/vendeur/montant
│   │
│   ├── stock/
│   │   ├── StockPage.tsx
│   │   ├── StockTable.tsx
│   │   └── AdjustStockModal.tsx
│   │
│   └── admin/
│       ├── ProductsAdminPage.tsx
│       ├── ProductForm.tsx
│       └── UsersAdminPage.tsx
│
├── pages/                         # Un composant par route (charge le feature)
│   ├── POSPage.tsx                # Interface principale de caisse
│   ├── SalesPage.tsx
│   ├── ClientsPage.tsx
│   ├── StockPage.tsx
│   ├── ProductsAdminPage.tsx
│   └── UsersAdminPage.tsx
│
├── stores/                        # Zustand stores
│   ├── cartStore.ts
│   ├── authStore.ts
│   └── uiStore.ts
│
├── hooks/                         # React Query hooks + custom hooks
│   ├── useProducts.ts
│   ├── useSales.ts
│   ├── useClients.ts
│   ├── useStock.ts
│   ├── useNetworkStatus.ts
│   └── useSyncQueue.ts
│
├── services/                      # Couche API
│   ├── api/
│   │   ├── client.ts              # Axios instance + interceptors
│   │   ├── auth.api.ts
│   │   ├── products.api.ts
│   │   ├── sales.api.ts
│   │   ├── clients.api.ts
│   │   └── stock.api.ts
│
├── offline/
│   ├── db.ts                      # Dexie.js schema IndexedDB
│   ├── syncQueue.ts               # File d'attente de synchronisation
│   └── sw-registration.ts         # Enregistrement Service Worker
│
├── i18n/
│   ├── index.ts                   # Config i18next
│   ├── fr/
│   │   ├── common.json
│   │   ├── pos.json
│   │   ├── auth.json
│   │   └── errors.json
│   └── en/
│       ├── common.json
│       ├── pos.json
│       ├── auth.json
│       └── errors.json
│
├── lib/
│   ├── formatters.ts              # formatPrice(), formatDate(), formatVAT()
│   ├── validators.ts              # Schemas Zod frontend
│   └── queryClient.ts             # TanStack Query client config
│
├── types/                         # Types locaux frontend
│   └── index.ts
│
└── main.tsx                       # Entry point
```

---

## 2. Arbre de Composants

### POSPage — Interface principale de caisse

```
POSPage
├── Navbar
│   ├── StoreName
│   ├── UserMenu (avatar + nom + logout)
│   └── NetworkStatusIndicator (online/offline/syncing)
│
├── CatalogPanel [col-gauche, 60%]
│   ├── SearchBar (debounce 300ms)
│   │   └── BarcodeScanner (caméra ou douchette)
│   ├── CategoryFilter (chips : Tout | Montres | Parfums | Vêtements)
│   ├── ProductGrid (react-virtual si > 100 produits)
│   │   └── ProductCard[]
│   │       ├── ProductImage (lazy)
│   │       ├── ProductInfo (nom, marque, contenance)
│   │       ├── ProductPrice (TTC mis en avant)
│   │       ├── StockIndicator (badge coloré)
│   │       └── AddToCartButton
│   └── ProductDetail (Dialog, ouvert au clic)
│       ├── ProductImages (carrousel)
│       ├── ProductInfo
│       ├── QuantitySelector
│       └── AddToCartButton
│
└── CartPanel [col-droite, 40%]
    ├── ClientSelector
    │   ├── ClientSearchInput
    │   ├── ClientSuggestions (dropdown)
    │   └── ClientQuickCreate (modal inline)
    ├── CartItemList (scroll)
    │   └── CartItem[]
    │       ├── ProductThumbnail
    │       ├── ProductName + SKU
    │       ├── QuantityStepper (+/-/input)
    │       ├── LinePrice (HT + TTC)
    │       ├── DiscountInput (optionnel)
    │       └── RemoveButton
    ├── CartSummary
    │   ├── TotalHT
    │   ├── VATBreakdown (par taux)
    │   ├── TotalDiscount
    │   └── TotalTTC (mis en valeur)
    ├── CartActions
    │   ├── ClearCartButton
    │   └── CheckoutButton → ouvre CheckoutModal
    └── CheckoutModal (Dialog plein écran)
        ├── Step 1 — Récapitulatif commande
        ├── Step 2 — PaymentSelector
        │   ├── CardPayment (simulé MVP)
        │   ├── CashPayment (rendu monnaie)
        │   └── MixedPayment (split CB + espèces)
        ├── Step 3 — Confirmation + chargement
        └── Step 4 — ReceiptPreview
            ├── TicketHTML (aperçu stylé)
            ├── DownloadPDFButton
            └── EmailReceiptButton
```

---

## 3. Zustand Stores

### cartStore.ts

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '@pos-lvmh/shared/types';
import { db } from '../offline/db';

export interface CartLine {
  productId: string;
  productName: string;
  productSku: string;
  imageUrl: string | null;
  unitPriceHT: number; // En centimes
  vatRate: number;
  quantity: number;
  discountAmount: number; // En centimes
  lineHT: number; // Calculé
  lineVAT: number; // Calculé
  lineTTC: number; // Calculé
}

interface CartTotals {
  totalHT: number;
  totalVAT: number;
  totalTTC: number;
  totalDiscount: number;
  vatBreakdown: Record<string, { base: number; vat: number }>;
}

interface CartStore {
  lines: CartLine[];
  clientId: string | null;
  totals: CartTotals;

  // Actions
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setDiscount: (productId: string, discountAmount: number) => void;
  setClient: (clientId: string | null) => void;
  clearCart: () => void;
}

function calculateTotals(lines: CartLine[]): CartTotals {
  const vatBreakdown: Record<string, { base: number; vat: number }> = {};
  let totalHT = 0,
    totalVAT = 0,
    totalDiscount = 0;

  for (const line of lines) {
    const lineHT = line.unitPriceHT * line.quantity - line.discountAmount;
    const lineVAT = Math.round(lineHT * line.vatRate);

    totalHT += lineHT;
    totalVAT += lineVAT;
    totalDiscount += line.discountAmount;

    const key = `${Math.round(line.vatRate * 100)}%`;
    vatBreakdown[key] = vatBreakdown[key] ?? { base: 0, vat: 0 };
    vatBreakdown[key].base += lineHT;
    vatBreakdown[key].vat += lineVAT;
  }

  return { totalHT, totalVAT, totalTTC: totalHT + totalVAT, totalDiscount, vatBreakdown };
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      lines: [],
      clientId: null,
      totals: calculateTotals([]),

      addItem: (product, quantity = 1) => {
        const lines = get().lines;
        const existing = lines.find((l) => l.productId === product.id);

        let newLines: CartLine[];
        if (existing) {
          newLines = lines.map((l) =>
            l.productId === product.id ? { ...l, quantity: l.quantity + quantity } : l,
          );
        } else {
          const line: CartLine = {
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            imageUrl: product.imageUrl,
            unitPriceHT: product.priceHT,
            vatRate: product.vatRate,
            quantity,
            discountAmount: 0,
            lineHT: product.priceHT * quantity,
            lineVAT: Math.round(product.priceHT * quantity * product.vatRate),
            lineTTC: Math.round(product.priceHT * quantity * (1 + product.vatRate)),
          };
          newLines = [...lines, line];
        }

        // Recalcule les lignes
        newLines = newLines.map((l) => ({
          ...l,
          lineHT: l.unitPriceHT * l.quantity - l.discountAmount,
          lineVAT: Math.round((l.unitPriceHT * l.quantity - l.discountAmount) * l.vatRate),
          lineTTC: Math.round((l.unitPriceHT * l.quantity - l.discountAmount) * (1 + l.vatRate)),
        }));

        set({ lines: newLines, totals: calculateTotals(newLines) });
      },

      removeItem: (productId) => {
        const lines = get().lines.filter((l) => l.productId !== productId);
        set({ lines, totals: calculateTotals(lines) });
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        const lines = get().lines.map((l) => (l.productId === productId ? { ...l, quantity } : l));
        set({ lines, totals: calculateTotals(lines) });
      },

      setDiscount: (productId, discountAmount) => {
        const lines = get().lines.map((l) =>
          l.productId === productId ? { ...l, discountAmount } : l,
        );
        set({ lines, totals: calculateTotals(lines) });
      },

      setClient: (clientId) => set({ clientId }),

      clearCart: () => set({ lines: [], clientId: null, totals: calculateTotals([]) }),
    }),
    {
      name: 'pos-cart',
      storage: {
        getItem: async (name) => {
          const val = await db.cart.get(name);
          return val ? JSON.parse(val.data) : null;
        },
        setItem: async (name, value) => {
          await db.cart.put({ key: name, data: JSON.stringify(value) });
        },
        removeItem: async (name) => {
          await db.cart.delete(name);
        },
      },
    },
  ),
);
```

### authStore.ts

```typescript
import { create } from 'zustand';

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: 'CASHIER' | 'MANAGER' | 'ADMIN';
  storeId: string;
}

interface AuthStore {
  user: AuthUser | null;
  accessToken: string | null; // En mémoire UNIQUEMENT (jamais localStorage)
  isAuthenticated: boolean;

  setAuth: (user: AuthUser, token: string) => void;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,

  setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
  setAccessToken: (accessToken) => set({ accessToken }),
  clearAuth: () => set({ user: null, accessToken: null, isAuthenticated: false }),
}));
```

### uiStore.ts

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';
type Locale = 'fr' | 'en';
type ViewMode = 'grid' | 'list';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface UIStore {
  theme: Theme;
  locale: Locale;
  viewMode: ViewMode;
  sidebarOpen: boolean;
  toasts: Toast[];

  setTheme: (t: Theme) => void;
  setLocale: (l: Locale) => void;
  setViewMode: (v: ViewMode) => void;
  toggleSidebar: () => void;
  addToast: (type: Toast['type'], message: string) => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      theme: 'light',
      locale: 'fr',
      viewMode: 'grid',
      sidebarOpen: true,
      toasts: [],

      setTheme: (theme) => set({ theme }),
      setLocale: (locale) => set({ locale }),
      setViewMode: (viewMode) => set({ viewMode }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      addToast: (type, message) => {
        const id = crypto.randomUUID();
        set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
        setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000);
      },
      removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: 'pos-ui',
      partialize: (s) => ({ theme: s.theme, locale: s.locale, viewMode: s.viewMode }),
    },
  ),
);
```

---

## 4. React Query Hooks

```typescript
// hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '../services/api/products.api';
import { db } from '../offline/db';
import { useNetworkStatus } from './useNetworkStatus';

export const productKeys = {
  all: ['products'] as const,
  list: (filters: Record<string, unknown>) => [...productKeys.all, 'list', filters] as const,
  detail: (id: string) => [...productKeys.all, 'detail', id] as const,
};

export function useProducts(filters: ProductFilters = {}) {
  const { isOnline } = useNetworkStatus();

  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: async () => {
      if (!isOnline) {
        // Fallback IndexedDB
        const cached = await db.products.toArray();
        return { data: cached, total: cached.length, page: 1, pages: 1 };
      }
      const response = await productsApi.list(filters);
      // Mise à jour du cache local
      await db.products.bulkPut(response.data);
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes en mémoire
    placeholderData: (prev) => prev, // Garde les données précédentes pendant le rechargement
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => productsApi.getById(id),
    staleTime: 10 * 60 * 1000,
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) =>
      productsApi.update(id, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: productKeys.list({}) });
      qc.invalidateQueries({ queryKey: productKeys.detail(vars.id) });
    },
  });
}

// hooks/useSales.ts
export const saleKeys = {
  all: ['sales'] as const,
  list: (filters: Record<string, unknown>) => [...saleKeys.all, 'list', filters] as const,
  detail: (id: string) => [...saleKeys.all, 'detail', id] as const,
};

export function useSales(filters: SaleFilters = {}) {
  return useQuery({
    queryKey: saleKeys.list(filters),
    queryFn: () => salesApi.list(filters),
    staleTime: 30 * 1000,
  });
}

export function useCreateSale() {
  const qc = useQueryClient();
  const { isOnline } = useNetworkStatus();
  const { addToast } = useUIStore();

  return useMutation({
    mutationFn: async (dto: CreateSaleDto) => {
      if (!isOnline) {
        // Mode offline : enqueue localement
        await syncQueue.enqueue({ type: 'CREATE_SALE', payload: dto });
        return { id: `offline-${Date.now()}`, status: 'PENDING_SYNC' } as Sale;
      }
      return salesApi.create(dto);
    },
    onSuccess: (sale) => {
      if (sale.status !== 'PENDING_SYNC') {
        qc.invalidateQueries({ queryKey: saleKeys.all });
        addToast('success', 'Vente enregistrée avec succès');
      } else {
        addToast('info', 'Vente sauvegardée en attente de synchronisation');
      }
    },
    onError: () => addToast('error', 'Erreur lors de la vente'),
  });
}
```

---

## 5. Services API (Client HTTP)

```typescript
// services/api/client.ts
import axios, { type AxiosInstance } from 'axios';
import { useAuthStore } from '../../stores/authStore';

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

export const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10_000,
  withCredentials: true, // Pour les cookies httpOnly (refresh token)
});

// Injecte l'access token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh sur 401
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve) => {
        refreshQueue.push((token: string) => {
          original.headers.Authorization = `Bearer ${token}`;
          resolve(apiClient(original));
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      );
      const newToken: string = data.accessToken;
      useAuthStore.getState().setAccessToken(newToken);
      refreshQueue.forEach((cb) => cb(newToken));
      refreshQueue = [];
      original.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(original);
    } catch {
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  },
);
```

---

## 6. Stratégie Offline — PWA

### Dexie.js Schema

```typescript
// offline/db.ts
import Dexie, { type Table } from 'dexie';
import type { Product, Sale } from '@pos-lvmh/shared/types';

interface CartEntry {
  key: string;
  data: string;
}
interface SyncQueueItem {
  id?: number;
  type: 'CREATE_SALE' | 'UPDATE_CLIENT';
  payload: unknown;
  createdAt: Date;
  attempts: number;
  lastError: string | null;
}
interface CachedProduct extends Product {
  cachedAt: Date;
}

class POSDatabase extends Dexie {
  products!: Table<CachedProduct>;
  cart!: Table<CartEntry>;
  pendingSales!: Table<SyncQueueItem>;

  constructor() {
    super('pos-lvmh-db');
    this.version(1).stores({
      products: 'id, sku, category, brand, active',
      cart: 'key',
      pendingSales: '++id, type, createdAt, attempts',
    });
  }
}

export const db = new POSDatabase();
```

### Sync Queue

```typescript
// offline/syncQueue.ts
import { db } from './db';
import { salesApi } from '../services/api/sales.api';
import { useUIStore } from '../stores/uiStore';

export const syncQueue = {
  async enqueue(item: { type: string; payload: unknown }) {
    await db.pendingSales.add({ ...item, createdAt: new Date(), attempts: 0, lastError: null });
  },

  async processAll() {
    const items = await db.pendingSales.orderBy('createdAt').toArray();
    if (items.length === 0) return;

    useUIStore.getState().addToast('info', `Synchronisation de ${items.length} vente(s)…`);
    let synced = 0;

    for (const item of items) {
      try {
        if (item.type === 'CREATE_SALE') {
          await salesApi.create(item.payload as CreateSaleDto);
        }
        await db.pendingSales.delete(item.id!);
        synced++;
      } catch (err) {
        await db.pendingSales.update(item.id!, {
          attempts: item.attempts + 1,
          lastError: String(err),
        });
        // Abandon après 3 tentatives
        if (item.attempts >= 2) {
          useUIStore
            .getState()
            .addToast(
              'error',
              `Vente du ${item.createdAt.toLocaleTimeString()} impossible à synchroniser`,
            );
        }
      }
    }

    if (synced > 0) {
      useUIStore.getState().addToast('success', `${synced} vente(s) synchronisée(s) !`);
    }
  },
};
```

### Hook useNetworkStatus

```typescript
// hooks/useNetworkStatus.ts
import { useState, useEffect } from 'react';
import { syncQueue } from '../offline/syncQueue';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setIsSyncing(true);
      await syncQueue.processAll();
      setIsSyncing(false);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, isSyncing };
}
```

---

## 7. Routing (React Router v6)

```typescript
// main.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoginPage } from './features/auth/LoginPage';
import { UserRole } from '@pos-lvmh/shared/constants';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <ProtectedRoute minRole={UserRole.CASHIER}><AppShell /></ProtectedRoute>,
    children: [
      { index: true, lazy: () => import('./pages/POSPage').then((m) => ({ Component: m.POSPage })) },
      { path: 'sales', lazy: () => import('./pages/SalesPage').then((m) => ({ Component: m.SalesPage })) },
      { path: 'clients', lazy: () => import('./pages/ClientsPage').then((m) => ({ Component: m.ClientsPage })) },
      { path: 'stock', lazy: () => import('./pages/StockPage').then((m) => ({ Component: m.StockPage })) },
      {
        path: 'admin',
        element: <ProtectedRoute minRole={UserRole.MANAGER}><Outlet /></ProtectedRoute>,
        children: [
          { path: 'products', lazy: () => import('./pages/ProductsAdminPage').then((m) => ({ Component: m.ProductsAdminPage })) },
          { path: 'users', element: <ProtectedRoute minRole={UserRole.ADMIN}><UsersAdminPage /></ProtectedRoute> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
```

### ProtectedRoute

```typescript
// components/layout/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '@pos-lvmh/shared/constants';

const ROLE_LEVEL = { CASHIER: 1, MANAGER: 2, ADMIN: 3 } as const;

interface Props { children: React.ReactNode; minRole: UserRole; }

export function ProtectedRoute({ children, minRole }: Props) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;

  if (ROLE_LEVEL[user.role] < ROLE_LEVEL[minRole]) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
```

---

## 8. Internationalisation (i18next)

```typescript
// i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import frCommon from './fr/common.json';
import frPos from './fr/pos.json';
import frErrors from './fr/errors.json';
import enCommon from './en/common.json';
import enPos from './en/pos.json';
import enErrors from './en/errors.json';

i18n.use(initReactI18next).init({
  resources: {
    fr: { common: frCommon, pos: frPos, errors: frErrors },
    en: { common: enCommon, pos: enPos, errors: enErrors },
  },
  lng: localStorage.getItem('pos-locale') ?? 'fr',
  fallbackLng: 'fr',
  ns: ['common', 'pos', 'errors'],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});
```

```json
// i18n/fr/pos.json
{
  "cart": {
    "empty": "Panier vide",
    "total_ht": "Total HT",
    "total_tva": "TVA {{rate}}",
    "total_ttc": "Total TTC",
    "checkout": "Encaisser",
    "clear": "Vider le panier"
  },
  "payment": {
    "card": "Carte bancaire",
    "cash": "Espèces",
    "mixed": "Paiement mixte",
    "change": "Rendu monnaie",
    "confirm": "Confirmer le paiement"
  },
  "product": {
    "add_to_cart": "Ajouter",
    "out_of_stock": "Rupture de stock",
    "low_stock": "Stock faible ({{count}})"
  },
  "offline": {
    "banner": "Mode hors-ligne — ventes sauvegardées localement",
    "syncing": "Synchronisation en cours…",
    "synced": "{{count}} vente(s) synchronisée(s)"
  }
}
```

---

## 9. Design System — Tailwind Luxury

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette luxe — tons neutres + or
        luxury: {
          50: '#fdfcf7',
          100: '#f9f6eb',
          200: '#f0e8cc',
          300: '#e2d09d',
          400: '#d0b56c',
          500: '#c09a44',
          600: '#a67d35',
          700: '#86612a',
          800: '#6b4c22',
          900: '#58401e',
        },
        gold: { DEFAULT: '#C09A44', light: '#D4B96A', dark: '#A67D35' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        display: ['Cormorant Garamond', 'serif'],
      },
      fontSize: {
        'price-lg': ['2rem', { lineHeight: '2.5rem', fontWeight: '600' }],
        'price-sm': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '500' }],
      },
      spacing: { '18': '4.5rem', '88': '22rem', '128': '32rem' },
      boxShadow: {
        luxury: '0 4px 24px -4px rgba(192, 154, 68, 0.15)',
        card: '0 2px 12px -2px rgba(0, 0, 0, 0.08)',
      },
    },
  },
} satisfies Config;
```

---

_Document v1.0.0 — POS LVMH Frontend — 2026-02-20 — Expert Frontend_
