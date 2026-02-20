# Architecture Backend — POS LVMH

**Version** : 1.0 | **Date** : 2026-02-20 | **Expert Backend**

---

## 1. Structure des Répertoires Backend

```
apps/backend/
├── src/
│   ├── routes/
│   │   ├── auth.routes.ts          # POST /login, /refresh, /logout, GET /me
│   │   ├── products.routes.ts      # CRUD produits + recherche
│   │   ├── sales.routes.ts         # POST /sales, GET /sales, /cancel, /ticket
│   │   ├── clients.routes.ts       # CRUD clients + /purchases
│   │   ├── stock.routes.ts         # GET stock, PUT ajustement, GET mouvements
│   │   └── users.routes.ts         # CRUD utilisateurs (Admin)
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts      # login(), refresh(), logout(), me()
│   │   ├── products.controller.ts  # list(), getById(), create(), update(), delete()
│   │   ├── sales.controller.ts     # create(), list(), getById(), cancel(), getTicket()
│   │   ├── clients.controller.ts   # list(), getById(), create(), update(), gdprDelete()
│   │   ├── stock.controller.ts     # getByStore(), adjust(), getMovements()
│   │   └── users.controller.ts     # list(), create(), update(), toggle()
│   │
│   ├── services/
│   │   ├── auth.service.ts         # login(), refreshToken(), logout(), hashPassword()
│   │   ├── products.service.ts     # CRUD + recherche + pagination
│   │   ├── sales.service.ts        # createSale() avec transaction atomique
│   │   ├── clients.service.ts      # CRUD + stats (totalSpent, visitCount)
│   │   ├── stock.service.ts        # checkStock(), decrementStock(), getMovements()
│   │   ├── ticket.service.ts       # generatePDF(), uploadToStorage()
│   │   └── audit.service.ts        # logAction() → auditLogs collection
│   │
│   ├── repositories/
│   │   ├── users.repository.ts     # findByEmail(), findById(), update()
│   │   ├── products.repository.ts  # findAll(filters), findById(), create(), update()
│   │   ├── sales.repository.ts     # create(), findAll(filters), findById()
│   │   ├── clients.repository.ts   # findByQuery(), findById(), create(), update()
│   │   └── stock.repository.ts     # getStock(), updateStock(), addMovement()
│   │
│   ├── middleware/
│   │   ├── authenticate.ts         # Vérifie JWT access token → req.user
│   │   ├── authorize.ts            # RBAC : authorize(UserRole.MANAGER)
│   │   ├── rateLimiter.ts          # 100 req/min/IP, 5 login/5min
│   │   ├── requestLogger.ts        # Pino structured logging
│   │   ├── errorHandler.ts         # Global Express error handler
│   │   └── validate.ts             # Validation Zod (body/query/params)
│   │
│   ├── validators/
│   │   ├── auth.validators.ts      # LoginDto, RefreshDto
│   │   ├── products.validators.ts  # CreateProductDto, UpdateProductDto, SearchQuery
│   │   ├── sales.validators.ts     # CreateSaleDto, SaleLineDto, ListSalesQuery
│   │   ├── clients.validators.ts   # CreateClientDto, UpdateClientDto
│   │   └── stock.validators.ts     # AdjustStockDto, GetMovementsQuery
│   │
│   ├── utils/
│   │   ├── logger.ts               # Instance Pino configurée
│   │   ├── token.ts                # sign/verify/rotate JWT
│   │   ├── password.ts             # hash/verify Argon2id
│   │   ├── errors.ts               # AppError + ErrorCode enum
│   │   └── firestore.ts            # Helpers (toTimestamp, fromTimestamp, paginate)
│   │
│   ├── config/
│   │   ├── firebase.ts             # initializeApp + getFirestore
│   │   └── env.ts                  # Variables d'env validées (Zod)
│   │
│   ├── app.ts                      # Factory Express (sans listen)
│   └── functions/
│       └── index.ts                # export const api = onRequest(app)
│
├── scripts/
│   └── seed.ts                     # Seed Firestore (users + produits démo)
│
├── jest.config.ts
├── tsconfig.json
└── package.json
```

---

## 2. Architecture en Couches

### Pattern : routes → controllers → services → repositories

```
Request HTTP
    │
    ▼
[routes/*.routes.ts]          — Déclare les endpoints, attache middleware + controller
    │
    ▼
[middleware/authenticate.ts]  — Vérifie JWT, injecte req.user
[middleware/authorize.ts]     — Vérifie req.user.role >= rôle requis
[middleware/validate.ts]      — Valide body/query avec Zod
    │
    ▼
[controllers/*.controller.ts] — Extrait les données de req, appelle le service, renvoie res.json()
    │
    ▼
[services/*.service.ts]       — Logique métier pure (calculs, règles, orchestration)
    │
    ▼
[repositories/*.repository.ts]— Accès Firestore uniquement (lecture/écriture)
    │
    ▼
[Cloud Firestore]
```

### Exemple complet : POST /api/sales

**routes/sales.routes.ts**

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { CreateSaleDto } from '../validators/sales.validators';
import { SalesController } from '../controllers/sales.controller';
import { UserRole } from '@pos-lvmh/shared/constants';

export const salesRouter = Router();
const ctrl = new SalesController();

salesRouter.post(
  '/',
  authenticate,
  authorize(UserRole.CASHIER),
  validate({ body: CreateSaleDto }),
  ctrl.create,
);
```

**controllers/sales.controller.ts**

```typescript
import { Request, Response, NextFunction } from 'express';
import { SalesService } from '../services/sales.service';

export class SalesController {
  private salesService = new SalesService();

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.salesService.createSale({
        ...req.body,
        cashierId: req.user!.id,
        storeId: req.user!.storeId,
      });
      if (!result.success) return next(result.error);
      res.status(201).json(result.data);
    } catch (err) {
      next(err);
    }
  };
}
```

**services/sales.service.ts**

```typescript
import { StockService } from './stock.service';
import { SalesRepository } from '../repositories/sales.repository';
import { AuditService } from './audit.service';
import { AppError, ErrorCode } from '../utils/errors';
import type { CreateSaleDto } from '../validators/sales.validators';
import type { Sale } from '@pos-lvmh/shared/types';
import type { Result } from '../utils/errors';

export class SalesService {
  private salesRepo = new SalesRepository();
  private stockService = new StockService();
  private auditService = new AuditService();

  async createSale(
    dto: CreateSaleDto & { cashierId: string; storeId: string },
  ): Promise<Result<Sale>> {
    // 1. Vérifier le stock pour chaque ligne
    for (const line of dto.items) {
      const stockOk = await this.stockService.checkStock(
        line.productId,
        dto.storeId,
        line.quantity,
      );
      if (!stockOk) {
        return {
          success: false,
          error: new AppError(
            ErrorCode.INSUFFICIENT_STOCK,
            `Stock insuffisant pour ${line.productId}`,
            409,
          ),
        };
      }
    }

    // 2. Calculer les totaux
    const totals = this.calculateTotals(dto.items);

    // 3. Transaction atomique Firestore
    const sale = await this.salesRepo.createWithStockDecrement({
      ...dto,
      ...totals,
      status: 'COMPLETED',
      date: new Date(),
    });

    // 4. Audit log
    await this.auditService.logAction({
      userId: dto.cashierId,
      action: 'SALE_CREATED',
      resource: 'sales',
      resourceId: sale.id,
    });

    return { success: true, data: sale };
  }

  private calculateTotals(items: CreateSaleDto['items']) {
    let totalHT = 0,
      totalVAT = 0;
    for (const item of items) {
      const lineHT = item.unitPriceHT * item.quantity - (item.discountAmount ?? 0);
      const lineVAT = lineHT * item.vatRate;
      totalHT += lineHT;
      totalVAT += lineVAT;
    }
    return { totalHT, totalVAT, totalTTC: totalHT + totalVAT };
  }
}
```

**repositories/sales.repository.ts**

```typescript
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import type { CreateSalePayload, Sale } from '@pos-lvmh/shared/types';

export class SalesRepository {
  private db = getFirestore();

  async createWithStockDecrement(payload: CreateSalePayload): Promise<Sale> {
    const saleRef = this.db.collection('sales').doc();

    await this.db.runTransaction(async (tx) => {
      // Décrémente le stock de chaque produit
      for (const item of payload.items) {
        const stockRef = this.db
          .collection('products')
          .doc(item.productId)
          .collection('stock')
          .doc(payload.storeId);
        tx.update(stockRef, { quantity: FieldValue.increment(-item.quantity) });

        // Mouvement de stock
        const movRef = this.db.collection('stockMovements').doc();
        tx.set(movRef, {
          productId: item.productId,
          storeId: payload.storeId,
          type: 'OUT',
          quantity: item.quantity,
          relatedSaleId: saleRef.id,
          userId: payload.cashierId,
          date: FieldValue.serverTimestamp(),
        });
      }
      // Crée la vente
      tx.set(saleRef, { ...payload, createdAt: FieldValue.serverTimestamp() });
    });

    const doc = await saleRef.get();
    return { id: doc.id, ...doc.data() } as Sale;
  }
}
```

---

## 3. Schéma Firestore Détaillé

### Collection `users`

```typescript
interface UserDoc {
  email: string;
  displayName: string;
  passwordHash: string; // Argon2id
  role: 'CASHIER' | 'MANAGER' | 'ADMIN';
  storeId: string;
  active: boolean;
  failedAttempts: number; // Reset à 0 après login réussi
  lockedUntil: Timestamp | null; // null = non verrouillé
  createdAt: Timestamp;
  lastLogin: Timestamp | null;
  // sessions sous-collection :
  // sessions/{sessionId}/{ refreshTokenHash, expiresAt, deviceInfo }
}
```

**Indexes** : `email` (unique, via query `where('email', '==', ...)`)

---

### Collection `products`

```typescript
interface ProductDoc {
  name: string;
  brand: string;
  sku: string; // Unique par boutique
  ean: string | null; // Code-barres EAN13
  category: 'WATCHES' | 'CLOTHING' | 'PERFUME';
  subcategory: string;
  priceHT: number; // En centimes
  vatRate: number; // 0.20
  description: string;
  imageUrl: string | null; // Cloud Storage URL
  size: string | null;
  capacity: string | null;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // stock par boutique : sous-collection stock/{storeId}/{ quantity, minThreshold }
}
```

**Indexes composites** :

- `(category ASC, priceHT ASC)` — filtrage par catégorie + tri prix
- `(brand ASC, active ASC)` — filtrage par marque
- `(active ASC, createdAt DESC)` — liste par date de création

---

### Collection `sales`

```typescript
interface SaleDoc {
  storeId: string;
  cashierId: string;
  clientId: string | null;
  date: Timestamp;
  status: 'COMPLETED' | 'CANCELLED' | 'RETURNED';
  totalHT: number; // En centimes
  totalVAT: number;
  totalTTC: number;
  totalDiscount: number;
  paymentMode: 'CASH' | 'CARD' | 'MOBILE' | 'MIXED';
  paymentDetails: PaymentDetails;
  ticketUrl: string | null;
  syncedFromOffline: boolean;
  offlineCreatedAt: Timestamp | null;
  createdAt: Timestamp;
  // lines/ sous-collection : { productId, productName, sku, quantity,
  //   unitPriceHT, vatRate, discountAmount, lineHT, lineVAT, lineTTC }
}
```

**Indexes composites** :

- `(storeId ASC, date DESC)` — historique par boutique
- `(cashierId ASC, date DESC)` — historique par vendeur
- `(clientId ASC, date DESC)` — historique par client

---

### Collection `clients`

```typescript
interface ClientDoc {
  lastName: string;
  firstName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  birthDate: string | null;
  gender: 'M' | 'F' | 'OTHER' | null;
  loyaltyNumber: string | null;
  externalCode: string | null;
  marketingConsent: boolean;
  consentDate: Timestamp | null;
  stats: { totalSpent: number; visitCount: number; lastVisit: Timestamp | null };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  gdprDeletionRequested: boolean;
}
```

**Indexes** : `(lastName ASC, firstName ASC)`, `email`, `phone`, `loyaltyNumber`

---

### Collection `stockMovements`

```typescript
interface StockMovementDoc {
  storeId: string;
  productId: string;
  type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT' | 'RETURN';
  quantity: number;
  reason: string | null;
  userId: string;
  date: Timestamp;
  relatedSaleId: string | null;
  relatedTransferId: string | null;
}
```

---

### Collection `auditLogs`

```typescript
interface AuditLogDoc {
  userId: string;
  action: string; // 'SALE_CREATED', 'PRODUCT_UPDATED', 'USER_LOCKED'…
  resource: string; // 'sales', 'products', 'users'…
  resourceId: string;
  timestamp: Timestamp;
  details: Record<string, unknown>;
  ipAddress: string;
}
```

**Rétention** : 2 ans (via TTL ou Cloud Scheduler cleanup)

---

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helpers
    function isAuthenticated() {
      return request.auth != null;
    }
    function hasRole(role) {
      return isAuthenticated() && request.auth.token.role == role;
    }
    function isManagerOrAdmin() {
      return hasRole('MANAGER') || hasRole('ADMIN');
    }
    function isAdmin() {
      return hasRole('ADMIN');
    }

    // ⚠️ Accès direct Firestore bloqué pour tous les clients
    // Toutes les opérations passent par l'API backend (Firebase Admin SDK)
    // Ces rules protègent contre un accès SDK direct

    match /users/{userId} {
      allow read: if isAdmin();
      allow write: if false; // Via API uniquement
    }

    match /products/{productId} {
      allow read: if isAuthenticated();
      allow create, update: if isManagerOrAdmin();
      allow delete: if isAdmin();
    }

    match /sales/{saleId} {
      allow read: if isAuthenticated() &&
        (isManagerOrAdmin() || resource.data.cashierId == request.auth.uid);
      allow create: if isAuthenticated();
      allow update: if isManagerOrAdmin();
      allow delete: if false;

      match /lines/{lineId} {
        allow read: if isAuthenticated();
        allow write: if false;
      }
    }

    match /clients/{clientId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isManagerOrAdmin();
      allow delete: if isAdmin();
    }

    match /auditLogs/{logId} {
      allow read: if isAdmin();
      allow write: if false; // Write uniquement via Admin SDK
    }

    match /stockMovements/{movId} {
      allow read: if isAuthenticated();
      allow write: if false;
    }
  }
}
```

---

## 4. Flux d'Authentification Complet

### Middleware Authenticate

```typescript
// middleware/authenticate.ts
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/token';
import { AppError, ErrorCode } from '../utils/errors';

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError(ErrorCode.UNAUTHORIZED, 'Token manquant', 401));
  }

  const token = authHeader.slice(7);
  const payload = await verifyAccessToken(token);
  if (!payload) {
    return next(new AppError(ErrorCode.TOKEN_EXPIRED, 'Token invalide ou expiré', 401));
  }

  req.user = { id: payload.sub!, role: payload.role, storeId: payload.storeId };
  next();
}
```

### Middleware Authorize (RBAC)

```typescript
// middleware/authorize.ts
import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@pos-lvmh/shared/constants';
import { AppError, ErrorCode } from '../utils/errors';

const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.CASHIER]: 1,
  [UserRole.MANAGER]: 2,
  [UserRole.ADMIN]: 3,
};

export function authorize(minRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(ErrorCode.UNAUTHORIZED, 'Non authentifié', 401));
    if (ROLE_HIERARCHY[req.user.role] < ROLE_HIERARCHY[minRole]) {
      return next(new AppError(ErrorCode.FORBIDDEN, 'Permissions insuffisantes', 403));
    }
    next();
  };
}
```

### Service Auth — Login + verrouillage

```typescript
// services/auth.service.ts
import * as argon2 from 'argon2';
import { UsersRepository } from '../repositories/users.repository';
import { signAccessToken, signRefreshToken } from '../utils/token';
import { AppError, ErrorCode } from '../utils/errors';

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export class AuthService {
  private usersRepo = new UsersRepository();

  async login(email: string, password: string) {
    const user = await this.usersRepo.findByEmail(email);
    if (!user) throw new AppError(ErrorCode.INVALID_CREDENTIALS, 'Identifiants invalides', 401);

    if (!user.active) throw new AppError(ErrorCode.FORBIDDEN, 'Compte désactivé', 403);

    if (user.lockedUntil && user.lockedUntil.toMillis() > Date.now()) {
      throw new AppError(ErrorCode.ACCOUNT_LOCKED, 'Compte verrouillé', 423, {
        unlockedAt: user.lockedUntil.toDate().toISOString(),
      });
    }

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      const newAttempts = user.failedAttempts + 1;
      const lockUntil =
        newAttempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_DURATION_MS) : null;
      await this.usersRepo.update(user.id, {
        failedAttempts: newAttempts,
        lockedUntil: lockUntil,
      });
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, 'Identifiants invalides', 401);
    }

    // Reset tentatives
    await this.usersRepo.update(user.id, {
      failedAttempts: 0,
      lockedUntil: null,
      lastLogin: new Date(),
    });

    const accessToken = await signAccessToken({
      sub: user.id,
      role: user.role,
      storeId: user.storeId,
    });
    const { refreshToken, hash } = await signRefreshToken(user.id);
    await this.usersRepo.saveRefreshToken(user.id, hash);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, role: user.role, displayName: user.displayName },
    };
  }
}
```

---

## 5. Schémas Zod — Validators

```typescript
// validators/auth.validators.ts
import { z } from 'zod';

export const LoginDto = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Mot de passe trop court'),
});

// validators/products.validators.ts
export const CreateProductDto = z.object({
  name: z.string().min(1).max(200),
  brand: z.string().min(1).max(100),
  sku: z.string().regex(/^[A-Z0-9-]{3,50}$/, 'SKU invalide'),
  ean: z.string().length(13).optional(),
  category: z.enum(['WATCHES', 'CLOTHING', 'PERFUME']),
  subcategory: z.string().min(1).max(100),
  priceHT: z.number().int().positive(), // En centimes
  vatRate: z.number().min(0).max(1),
  description: z.string().max(2000).optional(),
});

export const SearchProductQuery = z.object({
  q: z.string().max(200).optional(),
  category: z.enum(['WATCHES', 'CLOTHING', 'PERFUME']).optional(),
  brand: z.string().optional(),
  inStock: z.coerce.boolean().optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// validators/sales.validators.ts
export const SaleLineDto = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPriceHT: z.number().int().positive(), // En centimes
  vatRate: z.number().min(0).max(1),
  discountAmount: z.number().int().min(0).default(0),
});

export const CreateSaleDto = z.object({
  storeId: z.string().min(1),
  clientId: z.string().optional(),
  items: z.array(SaleLineDto).min(1).max(100),
  paymentMode: z.enum(['CASH', 'CARD', 'MOBILE', 'MIXED']),
  paymentDetails: z.object({
    cashAmount: z.number().int().min(0).optional(),
    cardAmount: z.number().int().min(0).optional(),
    changeGiven: z.number().int().min(0).optional(),
  }),
  syncedFromOffline: z.boolean().default(false),
  offlineCreatedAt: z.string().datetime().optional(),
});

// validators/clients.validators.ts
export const CreateClientDto = z.object({
  lastName: z.string().min(1).max(100),
  firstName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9\s-]{7,20}$/)
    .optional(),
  marketingConsent: z.boolean().default(false),
});
```

---

## 6. Gestion des Erreurs

### Error Handler Express

```typescript
// middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, ErrorCode } from '../utils/errors';
import { logger } from '../utils/logger';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Données invalides',
        details: err.flatten().fieldErrors,
      },
    });
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, path: req.path, method: req.method }, 'Application error');
    }
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, ...(err.context && { context: err.context }) },
    });
  }

  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  return res.status(500).json({
    error: { code: ErrorCode.INTERNAL_ERROR, message: 'Erreur interne du serveur' },
  });
}
```

---

## 7. Configuration Firebase Functions

```typescript
// src/functions/index.ts
import { onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { app } from '../app';

setGlobalOptions({
  region: 'europe-west1',
  memory: '512MiB',
  timeoutSeconds: 60,
  concurrency: 80,
  minInstances: 1, // Évite les cold starts en production
});

export const api = onRequest(
  {
    cors: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173'],
    invoker: 'public',
  },
  app,
);

// Scheduled: purge tokens révoqués expirés
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

export const purgeExpiredTokens = onSchedule('every 24 hours', async () => {
  const db = getFirestore();
  const snapshot = await db
    .collection('revokedTokens')
    .where('expiresAt', '<', new Date())
    .limit(500)
    .get();
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
});
```

---

## 8. Script de Seed Firestore

```typescript
// scripts/seed.ts
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as argon2 from 'argon2';

initializeApp({ credential: cert('./service-account.json') });
const db = getFirestore();

async function seed() {
  console.log('🌱 Seeding Firestore...');

  // 1. Boutique
  await db.collection('stores').doc('store-paris-01').set({
    name: 'Louis Vuitton — Champs-Élysées',
    address: '101 Av. des Champs-Élysées, 75008 Paris',
    country: 'FR',
    currency: 'EUR',
    timezone: 'Europe/Paris',
    locale: 'fr-FR',
    active: true,
  });

  // 2. Utilisateurs
  const users = [
    {
      id: 'user-admin',
      email: 'admin@lvmh.com',
      role: 'ADMIN',
      displayName: 'Admin LVMH',
      password: 'Admin@2026!',
    },
    {
      id: 'user-manager',
      email: 'manager@lvmh.com',
      role: 'MANAGER',
      displayName: 'Sophie Martin',
      password: 'Manager@2026!',
    },
    {
      id: 'user-cashier',
      email: 'caissier@lvmh.com',
      role: 'CASHIER',
      displayName: 'Marie Dupont',
      password: 'Cashier@2026!',
    },
  ];
  for (const u of users) {
    const passwordHash = await argon2.hash(u.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
    await db.collection('users').doc(u.id).set({
      email: u.email,
      displayName: u.displayName,
      passwordHash,
      role: u.role,
      storeId: 'store-paris-01',
      active: true,
      failedAttempts: 0,
      lockedUntil: null,
      createdAt: Timestamp.now(),
      lastLogin: null,
    });
  }

  // 3. Produits démo
  const products = [
    {
      id: 'prod-001',
      name: 'Sac Neverfull MM',
      brand: 'Louis Vuitton',
      sku: 'LV-NF-MM-001',
      category: 'CLOTHING',
      priceHT: 107500,
      vatRate: 0.2,
      stock: 8,
    },
    {
      id: 'prod-002',
      name: 'Montre Santos de Cartier',
      brand: 'Cartier',
      sku: 'CAR-SAN-001',
      category: 'WATCHES',
      priceHT: 583300,
      vatRate: 0.2,
      stock: 3,
    },
    {
      id: 'prod-003',
      name: 'Montre Aquaracer TAG Heuer',
      brand: 'TAG Heuer',
      sku: 'TAG-AQ-001',
      category: 'WATCHES',
      priceHT: 175000,
      vatRate: 0.2,
      stock: 5,
    },
    {
      id: 'prod-004',
      name: 'Chanel N°5 100ml',
      brand: 'Chanel',
      sku: 'CHA-N5-100',
      category: 'PERFUME',
      priceHT: 11250,
      vatRate: 0.2,
      stock: 20,
    },
    {
      id: 'prod-005',
      name: 'Dior Sauvage EDP 200ml',
      brand: 'Dior',
      sku: 'DIO-SAU-200',
      category: 'PERFUME',
      priceHT: 15833,
      vatRate: 0.2,
      stock: 15,
    },
    {
      id: 'prod-006',
      name: 'Gucci Bloom 50ml',
      brand: 'Gucci',
      sku: 'GUC-BLO-050',
      category: 'PERFUME',
      priceHT: 8333,
      vatRate: 0.2,
      stock: 12,
    },
    {
      id: 'prod-007',
      name: 'Veste Dior Bar',
      brand: 'Dior',
      sku: 'DIO-BAR-38',
      category: 'CLOTHING',
      priceHT: 291667,
      vatRate: 0.2,
      stock: 2,
    },
    {
      id: 'prod-008',
      name: 'Foulard Hermès Carré 90',
      brand: 'Hermès',
      sku: 'HER-CA90-001',
      category: 'CLOTHING',
      priceHT: 33333,
      vatRate: 0.2,
      stock: 7,
    },
    {
      id: 'prod-009',
      name: 'Sneakers Balenciaga Triple S',
      brand: 'Balenciaga',
      sku: 'BAL-TRS-42',
      category: 'CLOTHING',
      priceHT: 62500,
      vatRate: 0.2,
      stock: 4,
    },
    {
      id: 'prod-010',
      name: 'Ceinture Monogram LV',
      brand: 'Louis Vuitton',
      sku: 'LV-CEI-M90',
      category: 'CLOTHING',
      priceHT: 31667,
      vatRate: 0.2,
      stock: 10,
    },
  ];
  for (const p of products) {
    const { stock, ...productData } = p;
    await db
      .collection('products')
      .doc(p.id)
      .set({
        ...productData,
        description: '',
        imageUrl: null,
        ean: null,
        subcategory: '',
        size: null,
        capacity: null,
        active: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    await db
      .collection('products')
      .doc(p.id)
      .collection('stock')
      .doc('store-paris-01')
      .set({ quantity: stock, minThreshold: 2 });
  }

  console.log('✅ Seed terminé ! Boutique, 3 utilisateurs, 10 produits créés.');
}

seed().catch(console.error);
```

---

_Document v1.0.0 — POS LVMH Backend — 2026-02-20 — Expert Backend_
