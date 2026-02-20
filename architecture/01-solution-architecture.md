# Architecture Solution Globale — POS LVMH

**Version** : 1.0 | **Date** : 2026-02-20 | **Auteur** : Architecte Solution

---

## 1. Structure du Monorepo

```
pos-lvmh/                              # Racine monorepo
├── apps/
│   ├── frontend/                      # Application React (PWA)
│   │   ├── src/
│   │   │   ├── components/            # Composants UI réutilisables
│   │   │   │   ├── ui/                # shadcn/ui (Button, Input, Dialog…)
│   │   │   │   ├── layout/            # AppShell, Navbar, Sidebar
│   │   │   │   └── shared/            # OfflineBanner, LoadingSpinner…
│   │   │   ├── features/              # Features métier
│   │   │   │   ├── auth/              # Login, ProtectedRoute
│   │   │   │   ├── catalog/           # ProductGrid, ProductCard, Search
│   │   │   │   ├── cart/              # CartPanel, CartItem, CartSummary
│   │   │   │   ├── checkout/          # PaymentModal, ReceiptPreview
│   │   │   │   ├── clients/           # ClientSelector, ClientForm
│   │   │   │   ├── sales/             # SalesHistory, SaleDetail
│   │   │   │   ├── stock/             # StockPage, StockIndicator
│   │   │   │   └── admin/             # UsersAdmin, ProductsAdmin
│   │   │   ├── pages/                 # Pages/routes (un fichier par route)
│   │   │   ├── stores/                # Zustand stores
│   │   │   ├── hooks/                 # React Query hooks + custom hooks
│   │   │   ├── services/              # Couche API (axios, endpoints)
│   │   │   ├── offline/               # Dexie.js schema + sync queue
│   │   │   ├── i18n/                  # Traductions FR/EN
│   │   │   ├── lib/                   # Helpers, formatters, validators
│   │   │   ├── types/                 # Types locaux frontend
│   │   │   └── main.tsx               # Entry point
│   │   ├── public/
│   │   │   ├── manifest.json          # PWA manifest
│   │   │   └── icons/                 # App icons (192, 512)
│   │   ├── vite.config.ts
│   │   ├── vitest.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── backend/                       # Firebase Functions + Express
│       ├── src/
│       │   ├── routes/                # Déclaration des routes Express
│       │   │   ├── auth.routes.ts
│       │   │   ├── products.routes.ts
│       │   │   ├── sales.routes.ts
│       │   │   ├── clients.routes.ts
│       │   │   ├── stock.routes.ts
│       │   │   └── users.routes.ts
│       │   ├── controllers/           # Handlers HTTP (req/res)
│       │   ├── services/              # Logique métier pure
│       │   ├── repositories/          # Accès Firestore
│       │   ├── middleware/            # Auth, RBAC, errorHandler, rateLimiter
│       │   ├── validators/            # Schémas Zod
│       │   ├── utils/                 # Logger, tokens, crypto
│       │   ├── app.ts                 # Factory Express (sans listen)
│       │   └── functions/index.ts     # Export Firebase Functions
│       ├── jest.config.ts
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   └── shared/                        # Package partagé front/back
│       ├── src/
│       │   ├── types/                 # Interfaces métier (Product, Sale, Client…)
│       │   ├── schemas/               # Schémas Zod partagés
│       │   └── constants/             # Enums, constantes (UserRole, PaymentMethod…)
│       ├── tsconfig.json
│       └── package.json
│
├── docs/
│   ├── architecture/                  # ADR et diagrammes
│   ├── api/                           # OpenAPI spec
│   └── decisions/                     # ADR archivés
│
├── scripts/
│   ├── seed-firestore.ts              # Données de démo
│   └── setup.sh                       # Script setup complet
│
├── .github/
│   └── workflows/
│       ├── ci.yml                     # Lint + tests (PR)
│       ├── deploy-staging.yml         # Deploy staging (push develop)
│       └── deploy-prod.yml            # Deploy prod (merge main)
│
├── .husky/
│   ├── pre-commit                     # lint-staged
│   └── commit-msg                     # commitlint
│
├── firebase.json                      # Config Firebase (Hosting + Functions)
├── .firebaserc                        # Alias projets (staging/prod)
├── firestore.rules                    # Security rules
├── firestore.indexes.json             # Indexes composites
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── .eslintrc.cjs
├── .prettierrc
├── commitlint.config.cjs
└── package.json                       # Root (private, workspaces)
```

---

## 2. Décisions Architecturales (ADR)

### ADR-001 — Monorepo avec pnpm + Turborepo

**Statut** : Accepté

**Contexte** : Le projet a un frontend React, un backend Firebase Functions, et des types partagés.

**Décision** : Monorepo géré avec **pnpm workspaces + Turborepo**.

**Alternatives rejetées** :

- Multi-repos : synchronisation des types partagés complexe, risque de désynchronisation.
- Yarn workspaces seul : performances inférieures à pnpm.
- Nx : surcharge de configuration non justifiée.

**Conséquences** : partage de types sans publication NPM intermédiaire, pipeline CI/CD unifié avec cache Turborepo (60-70% plus rapide), refactoring cross-packages facilité.

---

### ADR-002 — Firebase Functions vs Serveur dédié

**Statut** : Accepté

**Décision** : Firebase Functions 2nd gen (Cloud Run) avec Express.js embarqué. Une seule Cloud Function HTTP expose l'ensemble de l'API via `/api/*`.

**Alternatives rejetées** :

- Cloud Run dédié : infrastructure plus lourde, facturation moins avantageuse.
- Vercel Functions : incompatible avec l'écosystème Firebase.

**Conséquences** : scaling automatique à zéro (coût réduit hors heures boutique), intégration native Firebase. Cold starts mitigés avec `minInstances: 1` en production.

---

### ADR-003 — Cloud Firestore vs PostgreSQL

**Statut** : Accepté

**Décision** : Cloud Firestore (mode natif, région europe-west1).

**Alternatives rejetées** :

- Cloud SQL/PostgreSQL : excellent pour requêtes relationnelles complexes mais nécessite Cloud SQL Auth Proxy, moins adapté au realtime et offline.
- MongoDB Atlas : pas de bénéfice par rapport à Firestore dans l'écosystème Firebase.

**Conséquences** : realtime updates natif, SDK offline intégré, scaling horizontal automatique. Contre : pas de jointures SQL (modélisation dénormalisée requise).

---

### ADR-004 — Zustand vs Redux Toolkit

**Statut** : Accepté

**Décision** : Zustand pour l'état global applicatif (cart, auth, UI).

**Alternatives rejetées** :

- Redux Toolkit : excellent mais boilerplate important, complexité non justifiée.
- Context API seul : problèmes de re-renders sur état fréquemment mis à jour (panier).

**Conséquences** : API minimaliste, zéro boilerplate, middleware `persist` natif pour IndexedDB. Nécessite des conventions d'équipe strictes sur la structure des stores.

---

### ADR-005 — Stratégie Offline-First (PWA)

**Statut** : Accepté

**Décision** : PWA + Service Worker (Workbox) + IndexedDB (Dexie.js) + Sync Queue.

Architecture :

1. SW cache assets + réponses GET produits
2. IndexedDB stocke produits, panier, file de sync
3. Mutations enqueued localement, rejouées à la reconnexion (Background Sync API)
4. Conflict resolution : last-write-wins + alerte manager en cas de conflit stock

**Conséquences** : encaissement possible jusqu'à 4h de déconnexion, UX transparente. Contre : complexité sync queue, risque conflit stock multi-terminaux offline.

---

### ADR-006 — JWT Stateless vs Sessions Serveur

**Statut** : Accepté

**Décision** : Access token RS256 (15 min, en mémoire Zustand) + Refresh token HS256 (8h, HttpOnly cookie).

**Alternatives rejetées** :

- Sessions serveur Redis : nécessite Redis managé, incompatible avec serverless stateless.
- Firebase Auth SDK seul : limite le contrôle sur les claims custom (storeId, role).

**Conséquences** : stateless compatible Firebase Functions, révocation possible via blacklist Firestore (`revokedTokens` collection avec TTL).

---

## 3. Diagrammes d'Architecture

### 3.1 Architecture Globale

```mermaid
graph TB
    subgraph "Dispositifs Boutique"
        T1[Terminal Caissier<br/>Chrome/Edge]
        T2[Terminal Manager]
        T3[Tablette iPad<br/>Safari PWA]
    end

    subgraph "Firebase Hosting CDN"
        CDN[React App + Service Worker]
    end

    subgraph "Firebase Functions 2nd gen"
        GW[Express API Gateway<br/>Auth · CORS · Rate Limit]
        AUTH_M[/auth/*]
        PROD_M[/products/*]
        SALES_M[/sales/*]
        CLI_M[/clients/*]
        STOCK_M[/stock/*]
    end

    subgraph "Firebase Backend"
        FS[(Cloud Firestore)]
        CS[Cloud Storage<br/>Images + PDFs]
        FL[Cloud Logging]
    end

    subgraph "Offline Layer"
        SW[Service Worker Workbox]
        IDB[(IndexedDB Dexie.js)]
        SQ[Sync Queue]
    end

    T1 & T2 & T3 <--> CDN
    CDN --> SW --> IDB --> SQ
    T1 & T2 & T3 <-->|HTTPS + JWT| GW
    GW --> AUTH_M & PROD_M & SALES_M & CLI_M & STOCK_M
    AUTH_M & PROD_M & SALES_M & CLI_M & STOCK_M --> FS
    PROD_M & SALES_M --> CS
    GW --> FL
```

### 3.2 Flux d'Authentification

```mermaid
sequenceDiagram
    actor C as Caissier
    participant FE as React (Zustand)
    participant API as POST /auth/login
    participant FS as Firestore

    C->>FE: email + password
    FE->>FE: Validation Zod client
    FE->>API: POST /auth/login
    API->>FS: GET users/{email}
    FS-->>API: { passwordHash, role, storeId }
    API->>API: Argon2id.verify(password, hash)
    API->>API: sign accessToken RS256 (15min)
    API->>API: sign refreshToken HS256 (8h)
    API->>FS: Store refreshToken hash in sessions
    API-->>FE: { accessToken } + Set-Cookie: refreshToken (HttpOnly)
    FE->>FE: authStore.setToken(accessToken)

    Note over FE,API: Auto-refresh (après 14min)
    FE->>API: POST /auth/refresh (cookie auto)
    API->>FS: Validate + rotate refreshToken
    API-->>FE: { newAccessToken }

    Note over C,FS: Déconnexion
    C->>FE: Logout
    FE->>API: POST /auth/logout
    API->>FS: revokedTokens/{jti} (TTL 8h)
    FE->>FE: authStore.clear()
```

### 3.3 Flux Offline

```mermaid
sequenceDiagram
    actor C as Caissier
    participant FE as React
    participant SW as Service Worker
    participant IDB as IndexedDB
    participant SQ as Sync Queue
    participant API as Firebase Functions

    Note over SW,API: Précaching (online)
    SW->>API: GET /products
    API-->>SW: Products[]
    SW->>IDB: cache products + timestamp

    Note over C,API: OFFLINE
    FE-->>C: OfflineBanner visible

    C->>FE: Valide vente
    FE->>IDB: Read products (cache local)
    FE->>IDB: Write sale (status: PENDING_SYNC)
    FE->>SQ: Enqueue { POST_SALE, payload }
    FE-->>C: Ticket local généré

    Note over C,API: RECONNEXION
    SW->>SQ: Process queue FIFO
    SQ->>API: POST /sales
    API-->>SQ: { saleId, confirmedAt }
    SQ->>IDB: Update status: SYNCED
    FE-->>C: Toast "1 vente synchronisée"
```

### 3.4 Flux d'Encaissement

```mermaid
sequenceDiagram
    actor C as Caissier
    participant Cart as cartStore (Zustand)
    participant FE as React
    participant API as POST /sales
    participant FS as Firestore

    C->>FE: Scan / recherche produit
    FE->>Cart: addItem(product, qty)
    Cart->>Cart: recalculate(HT, TVA par taux, TTC)
    C->>FE: Confirme paiement
    FE->>API: POST /sales { items, clientId?, payment, storeId }
    API->>API: authenticate JWT + authorize CASHIER

    par Vérif stock atomique
        API->>FS: checkStock(items) dans transaction
    and Création vente
        API->>FS: Write sales/{saleId} + lines/*
    end

    API->>FS: decrementStock(items)
    API->>FS: Write stockMovements
    API->>FS: COMMIT transaction
    API-->>FE: { saleId, receiptUrl }
    FE->>Cart: clearCart()
    FE-->>C: ReceiptPreview + bouton PDF
```

---

## 4. Plan de Delivery Détaillé — MVP

### Sprint 0 — Setup (Semaine 1)

**Objectif** : Monorepo initialisé, CI/CD fonctionnel, émulateurs Firebase opérationnels.

| ID   | Tâche                                                     | Durée | Dépendances |
| ---- | --------------------------------------------------------- | ----- | ----------- |
| S0.1 | Créer projets Firebase staging + prod                     | 0.5j  | —           |
| S0.2 | Init monorepo pnpm + Turborepo                            | 0.5j  | —           |
| S0.3 | Setup packages/shared (types + schemas + constants)       | 1j    | S0.2        |
| S0.4 | Setup apps/frontend (Vite + React + Tailwind + shadcn/ui) | 1j    | S0.2        |
| S0.5 | Setup apps/backend (Express + Firebase Functions)         | 1j    | S0.2        |
| S0.6 | Config ESLint + Prettier + Husky + commitlint             | 0.5j  | S0.2        |
| S0.7 | Config CI/CD GitHub Actions (3 workflows)                 | 1j    | S0.2        |
| S0.8 | Firestore security rules + indexes.json initiaux          | 0.5j  | S0.1        |
| S0.9 | Smoke test deploy staging → validation pipeline           | 0.5j  | S0.7        |

**Critères d'acceptation** : `pnpm build` vert, `pnpm test` vert, deploy staging fonctionnel.

---

### Sprint 1 — Auth + RBAC (Semaines 2-3)

**Objectif** : Authentification sécurisée end-to-end, RBAC opérationnel.

| ID   | Tâche                                               | Durée | Priorité |
| ---- | --------------------------------------------------- | ----- | -------- |
| B1.1 | Argon2id hash/verify service                        | 0.5j  | P0       |
| B1.2 | JWT sign/verify/refresh (RS256 + HS256)             | 1j    | P0       |
| B1.3 | POST /auth/login (verrouillage 5 échecs)            | 1j    | P0       |
| B1.4 | POST /auth/refresh + rotation                       | 0.5j  | P0       |
| B1.5 | POST /auth/logout + blacklist                       | 0.5j  | P0       |
| B1.6 | Middleware authenticate + authorize(RBAC)           | 1j    | P0       |
| B1.7 | Tests unitaires auth service (>95%)                 | 1j    | P0       |
| B1.8 | Tests intégration endpoints auth                    | 1j    | P0       |
| F1.1 | authStore Zustand (token en mémoire)                | 0.5j  | P0       |
| F1.2 | Axios interceptors (inject token + auto-refresh)    | 1j    | P0       |
| F1.3 | LoginPage (form + validation Zod + gestion erreurs) | 1j    | P0       |
| F1.4 | ProtectedRoute + redirect par rôle                  | 0.5j  | P0       |
| F1.5 | AppShell layout (header + sidebar responsive)       | 1j    | P1       |
| F1.6 | Tests composants auth                               | 0.5j  | P0       |

**Critères d'acceptation** :

- [ ] Login/logout fonctionnels
- [ ] Access token auto-renouvelé avant expiration
- [ ] Verrouillage après 5 échecs
- [ ] Rôle CASHIER → 403 sur routes MANAGER

---

### Sprint 2 — Catalogue + Stock (Semaines 4-5)

**Objectif** : Catalogue produits complet + mode offline initialisé.

| ID   | Tâche                                                              | Durée |
| ---- | ------------------------------------------------------------------ | ----- |
| B2.1 | CRUD produits (GET liste/détail, POST, PUT, DELETE soft)           | 2j    |
| B2.2 | Recherche full-text + filtres (catégorie, marque, stock)           | 1j    |
| B2.3 | Cloud Storage upload images produits                               | 1j    |
| B2.4 | Endpoints stock (GET par boutique, PUT ajustement, GET mouvements) | 1j    |
| B2.5 | Seed 50 produits démo (montres, parfums, vêtements)                | 0.5j  |
| F2.1 | Dexie.js schema IndexedDB (products, cart, pendingSales)           | 0.5j  |
| F2.2 | Service Worker Workbox (App Shell + cache produits)                | 1j    |
| F2.3 | useProducts / useProduct hooks (React Query + fallback offline)    | 1j    |
| F2.4 | ProductGrid + ProductCard (grille responsive)                      | 1j    |
| F2.5 | SearchBar (debounce 300ms) + BarcodeScanner (html5-qrcode)         | 1j    |
| F2.6 | Filtres catégorie/marque/stock (chips)                             | 0.5j  |
| F2.7 | StockIndicator (vert/orange/rouge selon seuils)                    | 0.5j  |
| F2.8 | OfflineBanner + hook useNetworkStatus                              | 0.5j  |

**Critères d'acceptation** :

- [ ] Catalogue en < 200ms (connexion normale)
- [ ] Produits servis depuis IndexedDB en mode offline
- [ ] MANAGER peut créer/modifier ; CASHIER reçoit 403

---

### Sprint 3 — Panier + Encaissement (Semaines 6-7)

**Objectif** : Tunnel d'encaissement complet, offline-first, ticket PDF.

| ID   | Tâche                                                              | Durée |
| ---- | ------------------------------------------------------------------ | ----- |
| B3.1 | POST /sales — transaction Firestore atomique                       | 2j    |
| B3.2 | Calcul TVA par taux et par catégorie                               | 0.5j  |
| B3.3 | Décrémentation stock dans la transaction                           | 1j    |
| B3.4 | Génération ticket PDF (jsPDF côté client)                          | 1j    |
| B3.5 | GET /sales (liste + filtres) + GET /sales/:id + /ticket            | 1j    |
| F3.1 | cartStore Zustand (addItem, removeItem, updateQty, clear, persist) | 1j    |
| F3.2 | Persistance panier IndexedDB (survive rechargement)                | 0.5j  |
| F3.3 | CartPanel + CartItem + CartSummary (TVA détaillée)                 | 1j    |
| F3.4 | CheckoutFlow multi-étapes (récap → paiement → confirmation)        | 1j    |
| F3.5 | PaymentSelector (CB/Espèces/Mixte) + calcul rendu monnaie          | 1j    |
| F3.6 | Gestion vente offline (enqueue sync queue)                         | 1j    |
| F3.7 | ReceiptPreview + téléchargement PDF + envoi email                  | 1j    |
| F3.8 | Tests E2E checkout flow complet                                    | 1j    |

**Critères d'acceptation** :

- [ ] Panier persiste après rechargement
- [ ] Transaction Firestore atomique (rollback si stock insuffisant)
- [ ] Vente offline synchronisée à la reconnexion
- [ ] Ticket PDF généré en < 2s

---

### Sprint 4 — Clients + Historique (Semaines 8-9)

**Objectif** : CRM basique + historique ventes filtrable.

| ID   | Tâche                                                     | Durée |
| ---- | --------------------------------------------------------- | ----- |
| B4.1 | CRUD clients + recherche (nom/email/tel)                  | 1j    |
| B4.2 | Association client ↔ vente                                | 0.5j  |
| B4.3 | GET /clients/:id/purchases (historique + stats)           | 1j    |
| B4.4 | Conformité RGPD (anonymisation Admin uniquement)          | 1j    |
| F4.1 | ClientSelector (recherche live pendant checkout)          | 1j    |
| F4.2 | ClientQuickCreate (modal inline, nom + prénom minimum)    | 0.5j  |
| F4.3 | ClientsPage (liste + fiche + historique achats)           | 1j    |
| F4.4 | SalesHistoryPage (tableau + filtres date/vendeur/montant) | 1j    |
| F4.5 | Export CSV historique                                     | 0.5j  |

**Critères d'acceptation** :

- [ ] Création rapide client < 30s pendant checkout
- [ ] Historique client accessible (total dépensé, nb visites)
- [ ] Historique ventes filtrable sur 12 mois

---

### Sprint 5 — Stabilisation + Production (Semaines 10-11)

**Objectif** : Qualité, sécurité, performance, mise en production.

| ID    | Tâche                                                | Durée |
| ----- | ---------------------------------------------------- | ----- |
| Q5.1  | Tests E2E Playwright (5 parcours critiques)          | 3j    |
| Q5.2  | Audit sécurité OWASP Top 10                          | 1j    |
| Q5.3  | Firestore Security Rules complètes + tests emulator  | 1j    |
| Q5.4  | Optimisation bundle Vite (code splitting, lazy)      | 1j    |
| Q5.5  | Lighthouse audit (PWA >= 90, Perf >= 85, A11y >= 90) | 0.5j  |
| Q5.6  | Documentation OpenAPI 3.1                            | 1j    |
| Q5.7  | Load testing k6 (10 terminaux, p95 < 500ms)          | 1j    |
| Q5.8  | Configuration monitoring Firebase + alertes          | 0.5j  |
| Q5.9  | Déploiement production + smoke tests                 | 1j    |
| Q5.10 | Guide utilisateur caissiers                          | 1j    |

---

## 5. Conventions de Code

### Nommage TypeScript

```typescript
// Types — PascalCase
type ProductId = string;
type ApiResponse<T> = { data: T; error: null } | { data: null; error: ApiError };

// Interfaces — PascalCase, sans préfixe "I"
interface Product {
  id: ProductId;
  sku: string;
  name: string;
  priceHT: number; // Toujours en centimes (129900 = 1 299,00 €)
  vatRate: number; // 0.20 = 20%
  category: ProductCategory;
  stockLevel: number;
}

// Enums — PascalCase + valeurs SCREAMING_SNAKE_CASE
enum UserRole {
  CASHIER = 'CASHIER',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN',
}
enum PaymentMethod {
  CARD = 'CARD',
  CASH = 'CASH',
  MIXED = 'MIXED',
}
enum SaleStatus {
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  PENDING_SYNC = 'PENDING_SYNC',
}

// Constantes — SCREAMING_SNAKE_CASE
const MAX_LOGIN_ATTEMPTS = 5;
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
```

### Gestion des Erreurs — Pattern Result

```typescript
type Result<T, E = AppError> = { success: true; data: T } | { success: false; error: E };

class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly statusCode: number = 500,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
  }
}

enum ErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}
```

### Structure des Imports

```typescript
// 1. Node.js natifs
import path from 'path';

// 2. Packages tiers
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';

// 3. Packages monorepo internes
import type { Product } from '@pos-lvmh/shared/types';
import { ProductSchema } from '@pos-lvmh/shared/schemas';
import { UserRole } from '@pos-lvmh/shared/constants';

// 4. Alias absolus internes
import { apiClient } from '@/services/api/client';
import { useCartStore } from '@/stores/cartStore';

// 5. Imports relatifs (même feature)
import { ProductCard } from './ProductCard';
```

---

## 6. Variables d'Environnement

```bash
# apps/backend/.env.example
FIREBASE_PROJECT_ID=pos-lvmh-staging
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@pos-lvmh-staging.iam.gserviceaccount.com
JWT_ACCESS_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
JWT_ACCESS_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n..."
JWT_REFRESH_SECRET=<256-bit-hex>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=8h
NODE_ENV=staging
PORT=3001
ALLOWED_ORIGINS=https://pos-lvmh-staging.web.app,http://localhost:5173
LOG_LEVEL=debug
GCS_BUCKET_PRODUCTS=pos-lvmh-staging-products
GCS_BUCKET_RECEIPTS=pos-lvmh-staging-receipts
```

```bash
# apps/frontend/.env.example
VITE_API_BASE_URL=https://us-central1-pos-lvmh-staging.cloudfunctions.net/api
VITE_FIREBASE_PROJECT_ID=pos-lvmh-staging
VITE_APP_ENV=staging
VITE_ENABLE_DEVTOOLS=true
```

---

## 7. Checklist Sprint 0 — Setup Complet

### A. Prérequis

```
[ ] A.1  nvm install 20 && nvm use 20
[ ] A.2  corepack enable && corepack prepare pnpm@latest --activate
[ ] A.3  npm install -g firebase-tools@latest
[ ] A.4  Vérifier : node -v (v20.x), pnpm -v (9.x), firebase --version
```

### B. Firebase

```
[ ] B.1  Créer projet Firebase STAGING (europe-west1, Firestore natif)
[ ] B.2  Créer projet Firebase PRODUCTION
[ ] B.3  firebase login
[ ] B.4  firebase init (Hosting, Functions, Firestore, Storage, Emulators)
[ ] B.5  Configurer .firebaserc avec alias staging/production
[ ] B.6  Générer paire RSA JWT :
         openssl genrsa -out jwt-private.pem 2048
         openssl rsa -in jwt-private.pem -pubout -out jwt-public.pem
         → Stocker dans GCP Secret Manager (JAMAIS committer)
```

### C. Monorepo

```
[ ] C.1  mkdir pos-lvmh && cd pos-lvmh && git init && git branch -M main
[ ] C.2  Créer .gitignore (node_modules, .env*, dist, *.pem, .firebase)
[ ] C.3  Créer pnpm-workspace.yaml
[ ] C.4  Créer package.json racine (private: true)
[ ] C.5  pnpm add -D turbo -w
[ ] C.6  Créer turbo.json
[ ] C.7  mkdir -p apps/frontend apps/backend packages/shared docs scripts
```

### D. Package Shared

```
[ ] D.1  cd packages/shared && pnpm init
[ ] D.2  pnpm add zod && pnpm add -D typescript
[ ] D.3  Créer tsconfig.json (extends ../../tsconfig.base.json)
[ ] D.4  Créer src/types/, src/schemas/, src/constants/
[ ] D.5  pnpm build → zéro erreur TypeScript
```

### E. Frontend

```
[ ] E.1  pnpm create vite@latest frontend -- --template react-ts
[ ] E.2  pnpm add react-router-dom zustand @tanstack/react-query axios dexie i18next react-i18next
[ ] E.3  pnpm add -D tailwindcss postcss autoprefixer vitest @testing-library/react
[ ] E.4  npx tailwindcss init -p
[ ] E.5  npx shadcn@latest init
[ ] E.6  Configurer alias @/ dans vite.config.ts
[ ] E.7  Ajouter vite-plugin-pwa + manifest.json
[ ] E.8  Configurer proxy Vite dev → localhost:3001
[ ] E.9  pnpm build → zéro erreur
```

### F. Backend

```
[ ] F.1  pnpm init + tsconfig.json
[ ] F.2  pnpm add express firebase-admin firebase-functions argon2 jsonwebtoken zod pino
[ ] F.3  pnpm add -D typescript @types/express jest supertest ts-jest
[ ] F.4  Créer app.ts (Express factory) + src/functions/index.ts
[ ] F.5  firebase emulators:start --only functions,firestore,storage → OK
```

### G. Qualité + CI/CD

```
[ ] G.1  pnpm add -D eslint prettier husky lint-staged @commitlint/cli -w
[ ] G.2  pnpm exec husky init
[ ] G.3  Créer .github/workflows/ci.yml, deploy-staging.yml, deploy-prod.yml
[ ] G.4  gh repo create lvmh-pos --private
[ ] G.5  Configurer secrets GitHub (FIREBASE_TOKEN, SA staging/prod, JWT keys)
[ ] G.6  Protéger branche main (require PR + CI green)
[ ] G.7  Premier push + pipeline CI vert → Sprint 0 TERMINÉ
```

---

## 8. Turbo Pipeline

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "test": { "dependsOn": ["build"], "outputs": ["coverage/**"] },
    "lint": { "outputs": [] },
    "typecheck": { "outputs": [] },
    "dev": { "cache": false, "persistent": true },
    "deploy:staging": { "dependsOn": ["build", "test", "lint"], "outputs": [] },
    "deploy:production": { "dependsOn": ["build", "test", "lint"], "outputs": [] }
  }
}
```

---

_Document v1.0.0 — POS LVMH — 2026-02-20 — Architecte Solution_
