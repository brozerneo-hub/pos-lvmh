# Stratégie QA & CI/CD — POS LVMH

**Version** : 1.0 | **Date** : 2026-02-20 | **Expert QA**

---

## 1. Stratégie de Tests Globale

### Pyramide de Tests

```
         /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
        /    E2E Playwright (10%)    \     ~5-10 scénarios critiques
       /    ~30-60s par test CI       \    Lents mais haute confiance
      /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
     /   Intégration API (20%)         \   Supertest + Firebase Emulator
    /   Endpoints, middlewares, RBAC    \  ~5-15s par test
   /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
  /      Unitaires (70%)                 \  Vitest + Jest + Testing Library
 /  Services, stores, composants, calculs  \ Rapides < 1s, feedback immédiat
/‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
```

### Couverture Cible par Couche

| Couche                          | Outil                    | Coverage min.          | Bloquant CI |
| ------------------------------- | ------------------------ | ---------------------- | ----------- |
| Frontend composants + hooks     | Vitest + Testing Library | 80%                    | Oui         |
| `useCartStore` (calculs panier) | Vitest                   | 95%                    | Oui         |
| `useAuthStore`                  | Vitest                   | 95%                    | Oui         |
| Backend services                | Jest                     | 85%                    | Oui         |
| `authService`                   | Jest                     | 95%                    | Oui         |
| `salesService`                  | Jest                     | 95%                    | Oui         |
| `rbacMiddleware`                | Jest                     | 95%                    | Oui         |
| Endpoints API                   | Supertest                | Tous les endpoints MVP | Oui         |
| Parcours critiques              | Playwright               | 5 scénarios            | Oui         |

### Definition of Done

Un test est acceptable si et seulement si :

- Il teste un **comportement observable** (pas une implémentation interne)
- Il peut être exécuté **de manière isolée** (pas de dépendance à l'ordre)
- Il **s'auto-nettoie** (pas de données résiduelles)
- Il **réussit de manière déterministe** (pas de flakiness)
- Son nom décrit clairement **ce qu'il teste et dans quel contexte**

### Philosophie : Quoi Tester / Quoi Éviter

| Tester ✅                                      | Éviter ❌                                   |
| ---------------------------------------------- | ------------------------------------------- |
| Comportements visibles (output donné un input) | Détails d'implémentation interne            |
| Cas limites (stock = 0, password = 5 essais)   | Tests 1:1 de chaque ligne de code           |
| Intégration entre couches (service + repo)     | Mocks excessifs qui rendent les tests creux |
| Parcours utilisateur complets (E2E)            | Tests E2E pour chaque micro-interaction     |
| Règles métier critiques (calcul TVA, RBAC)     | Tests qui répètent la logique testée        |

---

## 2. Tests Unitaires Frontend (Vitest + Testing Library)

### useCartStore — Calculs HT/TVA/TTC

```typescript
// src/stores/__tests__/cartStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCartStore } from '../cartStore';

const mockWatch: Product = {
  id: 'prod-001',
  name: 'Montre Santos',
  sku: 'CAR-SAN-001',
  priceHT: 58330, // 583,30 € HT → 700 € TTC (TVA 20%)
  vatRate: 0.2,
  imageUrl: null,
  category: 'WATCHES',
  stockLevel: 5,
};

const mockPerfume: Product = {
  id: 'prod-002',
  name: 'Chanel N°5 100ml',
  sku: 'CHA-N5-100',
  priceHT: 11250, // 112,50 € HT → 135 € TTC
  vatRate: 0.2,
  imageUrl: null,
  category: 'PERFUME',
  stockLevel: 20,
};

describe('useCartStore', () => {
  beforeEach(() => {
    useCartStore.setState({
      lines: [],
      clientId: null,
      totals: { totalHT: 0, totalVAT: 0, totalTTC: 0, totalDiscount: 0, vatBreakdown: {} },
    });
  });

  describe('addItem', () => {
    it('ajoute un produit avec les calculs corrects', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => result.current.addItem(mockWatch, 1));

      expect(result.current.lines).toHaveLength(1);
      expect(result.current.lines[0].quantity).toBe(1);
      expect(result.current.totals.totalHT).toBe(58330);
      expect(result.current.totals.totalVAT).toBe(11666); // 58330 × 0.20
      expect(result.current.totals.totalTTC).toBe(69996); // HT + VAT
    });

    it('incrémente la quantité si le produit est déjà dans le panier', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockWatch, 1);
        result.current.addItem(mockWatch, 2);
      });

      expect(result.current.lines).toHaveLength(1);
      expect(result.current.lines[0].quantity).toBe(3);
      expect(result.current.totals.totalHT).toBe(58330 * 3);
    });

    it('calcule correctement la TVA ventilée par taux pour 2 produits de même taux', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockWatch, 1);
        result.current.addItem(mockPerfume, 2);
      });

      const breakdown = result.current.totals.vatBreakdown['20%'];
      expect(breakdown).toBeDefined();
      expect(breakdown.base).toBe(58330 + 11250 * 2);
    });

    it('prend en compte la remise dans le calcul de la TVA', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockWatch, 1);
        result.current.setDiscount('prod-001', 5000); // Remise 50 €
      });

      const expectedHT = 58330 - 5000;
      expect(result.current.totals.totalHT).toBe(expectedHT);
      expect(result.current.totals.totalVAT).toBe(Math.round(expectedHT * 0.2));
      expect(result.current.totals.totalDiscount).toBe(5000);
    });
  });

  describe('removeItem', () => {
    it('retire le produit et recalcule les totaux', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockWatch, 1);
        result.current.addItem(mockPerfume, 1);
        result.current.removeItem('prod-001');
      });

      expect(result.current.lines).toHaveLength(1);
      expect(result.current.totals.totalHT).toBe(11250);
    });
  });

  describe('clearCart', () => {
    it('vide complètement le panier et réinitialise les totaux à zéro', () => {
      const { result } = renderHook(() => useCartStore());

      act(() => {
        result.current.addItem(mockWatch, 3);
        result.current.setClient('client-123');
        result.current.clearCart();
      });

      expect(result.current.lines).toHaveLength(0);
      expect(result.current.clientId).toBeNull();
      expect(result.current.totals.totalTTC).toBe(0);
    });
  });
});
```

### CartSummary — Affichage des totaux

```typescript
// src/features/cart/__tests__/CartSummary.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CartSummary } from '../CartSummary';
import { useCartStore } from '../../../stores/cartStore';

function setup(state: Partial<CartTotals> = {}) {
  useCartStore.setState({
    totals: {
      totalHT: 58330,
      totalVAT: 11666,
      totalTTC: 69996,
      totalDiscount: 0,
      vatBreakdown: { '20%': { base: 58330, vat: 11666 } },
      ...state,
    },
  });
  return render(<CartSummary />);
}

describe('CartSummary', () => {
  it('affiche le total TTC mis en valeur', () => {
    setup();
    expect(screen.getByTestId('total-ttc')).toHaveTextContent('699,96 €');
  });

  it('affiche la ventilation TVA par taux', () => {
    setup();
    expect(screen.getByText(/TVA 20%/i)).toBeInTheDocument();
    expect(screen.getByText('116,66 €')).toBeInTheDocument();
  });

  it('affiche la remise quand elle est non nulle', () => {
    setup({ totalDiscount: 5000 });
    expect(screen.getByTestId('total-discount')).toHaveTextContent('-50,00 €');
  });

  it('cache la ligne de remise quand la remise est zéro', () => {
    setup({ totalDiscount: 0 });
    expect(screen.queryByTestId('total-discount')).not.toBeInTheDocument();
  });
});
```

### ProtectedRoute — Guard par rôle

```typescript
// src/components/layout/__tests__/ProtectedRoute.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import { useAuthStore } from '../../../stores/authStore';
import { UserRole } from '@pos-lvmh/shared/constants';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, Navigate: ({ to }: { to: string }) => { mockNavigate(to); return null; } };
});

describe('ProtectedRoute', () => {
  it('redirige vers /login si non authentifié', () => {
    useAuthStore.setState({ isAuthenticated: false, user: null });
    render(<MemoryRouter><ProtectedRoute minRole={UserRole.CASHIER}><div>Contenu protégé</div></ProtectedRoute></MemoryRouter>);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
    expect(screen.queryByText('Contenu protégé')).not.toBeInTheDocument();
  });

  it('affiche le contenu pour un rôle suffisant', () => {
    useAuthStore.setState({ isAuthenticated: true, user: { id: 'u1', role: 'MANAGER', email: '', displayName: '', storeId: 's1' } });
    render(<MemoryRouter><ProtectedRoute minRole={UserRole.CASHIER}><div>Contenu protégé</div></ProtectedRoute></MemoryRouter>);
    expect(screen.getByText('Contenu protégé')).toBeInTheDocument();
  });

  it('redirige vers / si le rôle est insuffisant (CASHIER → route MANAGER)', () => {
    useAuthStore.setState({ isAuthenticated: true, user: { id: 'u1', role: 'CASHIER', email: '', displayName: '', storeId: 's1' } });
    render(<MemoryRouter><ProtectedRoute minRole={UserRole.MANAGER}><div>Admin seulement</div></ProtectedRoute></MemoryRouter>);
    expect(mockNavigate).toHaveBeenCalledWith('/');
    expect(screen.queryByText('Admin seulement')).not.toBeInTheDocument();
  });
});
```

---

## 3. Tests Unitaires Backend (Jest)

### authService — Login, échecs, verrouillage

```typescript
// src/services/__tests__/auth.service.test.ts
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AuthService } from '../auth.service';
import { UsersRepository } from '../../repositories/users.repository';
import * as argon2 from 'argon2';

jest.mock('../../repositories/users.repository');
jest.mock('argon2');

const mockUsersRepo = UsersRepository as jest.MockedClass<typeof UsersRepository>;

const validUser = {
  id: 'u1',
  email: 'test@lvmh.com',
  displayName: 'Test User',
  role: 'CASHIER',
  storeId: 's1',
  active: true,
  passwordHash: 'hashed',
  failedAttempts: 0,
  lockedUntil: null,
  lastLogin: null,
};

describe('AuthService.login', () => {
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService();
    mockUsersRepo.prototype.findByEmail.mockResolvedValue(validUser);
    mockUsersRepo.prototype.update.mockResolvedValue(undefined);
    mockUsersRepo.prototype.saveRefreshToken.mockResolvedValue(undefined);
    (argon2.verify as jest.MockedFunction<typeof argon2.verify>).mockResolvedValue(true);
  });

  it('retourne access + refresh token pour des identifiants valides', async () => {
    const result = await service.login('test@lvmh.com', 'ValidPass123!');
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.user.role).toBe('CASHIER');
  });

  it("lève INVALID_CREDENTIALS si l'utilisateur n'existe pas", async () => {
    mockUsersRepo.prototype.findByEmail.mockResolvedValue(null);
    await expect(service.login('nobody@lvmh.com', 'pass')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('lève INVALID_CREDENTIALS et incrémente failedAttempts si le mot de passe est incorrect', async () => {
    (argon2.verify as jest.MockedFunction<typeof argon2.verify>).mockResolvedValue(false);
    await expect(service.login('test@lvmh.com', 'WrongPass!')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
    expect(mockUsersRepo.prototype.update).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        failedAttempts: 1,
      }),
    );
  });

  it('verrouille le compte après 5 échecs consécutifs', async () => {
    (argon2.verify as jest.MockedFunction<typeof argon2.verify>).mockResolvedValue(false);
    mockUsersRepo.prototype.findByEmail.mockResolvedValue({ ...validUser, failedAttempts: 4 });

    await expect(service.login('test@lvmh.com', 'WrongPass!')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });

    expect(mockUsersRepo.prototype.update).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        failedAttempts: 5,
        lockedUntil: expect.any(Date),
      }),
    );
  });

  it('lève ACCOUNT_LOCKED si le compte est verrouillé', async () => {
    const lockedUntil = { toMillis: () => Date.now() + 1_000_000 };
    mockUsersRepo.prototype.findByEmail.mockResolvedValue({
      ...validUser,
      lockedUntil,
    });

    await expect(service.login('test@lvmh.com', 'AnyPass!')).rejects.toMatchObject({
      code: 'ACCOUNT_LOCKED',
    });
  });

  it('reset failedAttempts après un login réussi', async () => {
    mockUsersRepo.prototype.findByEmail.mockResolvedValue({ ...validUser, failedAttempts: 3 });
    await service.login('test@lvmh.com', 'ValidPass123!');
    expect(mockUsersRepo.prototype.update).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        failedAttempts: 0,
        lockedUntil: null,
      }),
    );
  });
});
```

### rbacMiddleware

```typescript
// src/middleware/__tests__/authorize.test.ts
import { describe, it, expect } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { authorize } from '../authorize';
import { UserRole } from '@pos-lvmh/shared/constants';

function mockReq(role: string): Request {
  return { user: { id: 'u1', role, storeId: 's1' } } as unknown as Request;
}

describe('authorize middleware', () => {
  it('autorise un MANAGER sur une route CASHIER', () => {
    const next = jest.fn();
    authorize(UserRole.CASHIER)(mockReq('MANAGER'), {} as Response, next);
    expect(next).toHaveBeenCalledWith(); // sans argument = succès
  });

  it('refuse un CASHIER sur une route MANAGER', () => {
    const next = jest.fn();
    authorize(UserRole.MANAGER)(mockReq('CASHIER'), {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'FORBIDDEN' }));
  });

  it("autorise un ADMIN sur n'importe quelle route", () => {
    const next = jest.fn();
    authorize(UserRole.ADMIN)(mockReq('ADMIN'), {} as Response, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('refuse si req.user est absent (non authentifié)', () => {
    const next = jest.fn();
    const req = {} as Request;
    authorize(UserRole.CASHIER)(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ code: 'UNAUTHORIZED' }));
  });
});
```

---

## 4. Tests d'Intégration API (Supertest + Emulator)

### POST /api/auth/login

```typescript
// src/routes/__tests__/auth.integration.test.ts
import request from 'supertest';
import { app } from '../../app';
import { testDb } from '../../test-utils/emulatorSetup';
import * as argon2 from 'argon2';

describe('POST /api/auth/login', () => {
  beforeAll(async () => {
    const hash = await argon2.hash('TestPass123!', { type: argon2.argon2id });
    await testDb.collection('users').doc('u-cashier').set({
      email: 'cashier@lvmh.com',
      passwordHash: hash,
      role: 'CASHIER',
      storeId: 's1',
      active: true,
      failedAttempts: 0,
      lockedUntil: null,
      lastLogin: null,
    });
  });

  it('200 avec tokens pour identifiants valides', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'cashier@lvmh.com', password: 'TestPass123!' });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('refreshToken')]),
    );
  });

  it('401 pour mot de passe incorrect', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'cashier@lvmh.com', password: 'WrongPassword' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('423 si le compte est verrouillé', async () => {
    await testDb
      .collection('users')
      .doc('u-cashier')
      .update({
        lockedUntil: new Date(Date.now() + 900_000),
      });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'cashier@lvmh.com', password: 'TestPass123!' });
    expect(res.status).toBe(423);
    expect(res.body.error.code).toBe('ACCOUNT_LOCKED');
  });

  it('400 pour email invalide (validation Zod)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: 'pass' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
```

---

## 5. Tests E2E (Playwright)

### playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'playwright-results.xml' }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, dependencies: ['setup'] },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, dependencies: ['setup'] },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

### Page Objects

```typescript
// e2e/pages/LoginPage.ts
import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorAlert: Locator;
  readonly lockoutAlert: Locator;

  constructor(private page: Page) {
    this.emailInput = page.getByLabel('Adresse e-mail');
    this.passwordInput = page.getByLabel('Mot de passe');
    this.submitButton = page.getByRole('button', { name: /se connecter/i });
    this.errorAlert = page.getByRole('alert').filter({ hasText: /identifiants/i });
    this.lockoutAlert = page.getByRole('alert').filter({ hasText: /verrouillé/i });
  }

  async goto() {
    await this.page.goto('/login');
    await expect(this.submitButton).toBeVisible();
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectLoginSuccess() {
    await expect(this.page).toHaveURL(/\/$/);
  }
  async expectErrorVisible() {
    await expect(this.errorAlert).toBeVisible();
  }
  async expectAccountLocked() {
    await expect(this.lockoutAlert).toBeVisible();
  }
}

// e2e/pages/POSPage.ts
export class POSPage {
  readonly searchInput: Locator;
  readonly cartItemsList: Locator;
  readonly checkoutButton: Locator;
  readonly cartTotal: Locator;

  constructor(private page: Page) {
    this.searchInput = page.getByPlaceholder(/rechercher un produit/i);
    this.cartItemsList = page.getByTestId('cart-items');
    this.checkoutButton = page.getByRole('button', { name: /encaisser/i });
    this.cartTotal = page.getByTestId('total-ttc');
  }

  async searchProduct(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForResponse('**/api/products**');
  }

  async addProductToCart(productName: string) {
    await this.page
      .getByTestId('product-card')
      .filter({ hasText: productName })
      .getByRole('button', { name: /ajouter/i })
      .click();
  }

  async proceedToPayment() {
    await this.checkoutButton.click();
    await expect(this.page.getByTestId('payment-modal')).toBeVisible();
  }

  async confirmPayment() {
    await this.page.getByRole('button', { name: /confirmer le paiement/i }).click();
  }

  async expectReceiptGenerated() {
    await expect(this.page.getByTestId('receipt-modal')).toBeVisible({ timeout: 10_000 });
  }
}
```

### Test E2E Principal — Parcours Complet

```typescript
// e2e/tests/checkout-flow.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { POSPage } from '../pages/POSPage';

test.describe('Parcours encaissement complet', () => {
  test('login → recherche → panier → paiement → ticket', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const posPage = new POSPage(page);

    // 1. Login
    await loginPage.goto();
    await loginPage.login('caissier@lvmh.com', 'Cashier@2026!');
    await loginPage.expectLoginSuccess();

    // 2. Recherche et ajout produit
    await posPage.searchProduct('Chanel');
    await expect(page.getByTestId('product-card')).toHaveCount({ gte: 1 });
    await posPage.addProductToCart('Chanel N°5 100ml');
    await expect(posPage.cartItemsList.getByTestId('cart-item')).toHaveCount(1);

    // 3. Paiement
    await posPage.proceedToPayment();
    await page.getByRole('tab', { name: /carte/i }).click();
    await posPage.confirmPayment();

    // 4. Ticket généré
    await posPage.expectReceiptGenerated();
    await expect(page.getByText(/ticket de caisse/i)).toBeVisible();

    // 5. Panier réinitialisé
    await page.getByRole('button', { name: /nouvelle vente/i }).click();
    await expect(posPage.cartItemsList).toBeEmpty();
  });

  test('alerte stock affiché pour produit hors stock', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('caissier@lvmh.com', 'Cashier@2026!');

    const posPage = new POSPage(page);
    await posPage.searchProduct('hors stock');

    await expect(page.getByTestId('product-card').getByText(/rupture/i)).toBeVisible();
    await expect(
      page.getByTestId('product-card').getByRole('button', { name: /ajouter/i }),
    ).toBeDisabled();
  });

  test('verrouillage compte après 5 tentatives échouées', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    for (let i = 0; i < 5; i++) {
      await loginPage.login('caissier@lvmh.com', 'MauvaisMotDePasse!');
      await loginPage.expectErrorVisible();
    }

    await loginPage.login('caissier@lvmh.com', 'Cashier@2026!');
    await loginPage.expectAccountLocked();
  });

  test('mode offline — vente → sync automatique', async ({ page, context }) => {
    const loginPage = new LoginPage(page);
    const posPage = new POSPage(page);

    await loginPage.goto();
    await loginPage.login('caissier@lvmh.com', 'Cashier@2026!');
    await page.waitForURL(/\/$/);
    await page.waitForTimeout(2000); // Attendre le précaching SW

    // Passage offline
    await context.setOffline(true);
    await expect(page.getByTestId('offline-banner')).toBeVisible();

    // Vente offline
    await posPage.addProductToCart('Chanel N°5 100ml');
    await posPage.proceedToPayment();
    await page.getByRole('tab', { name: /carte/i }).click();
    await posPage.confirmPayment();
    await expect(page.getByTestId('offline-queued-badge')).toBeVisible();

    // Retour online → sync
    await context.setOffline(false);
    await expect(page.getByTestId('offline-banner')).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/synchronisée/i)).toBeVisible({ timeout: 15_000 });
  });
});
```

---

## 6. Pipelines CI/CD GitHub Actions

### `.github/workflows/ci.yml`

```yaml
name: CI — Lint, Tests & Build

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [develop]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint-typecheck:
    name: Lint & TypeCheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20.x', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo lint typecheck

  unit-frontend:
    name: Tests Unitaires Frontend (Vitest)
    runs-on: ubuntu-latest
    needs: lint-typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20.x', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter frontend test:coverage
      - uses: actions/upload-artifact@v4
        with: { name: coverage-frontend, path: apps/frontend/coverage/ }

  unit-backend:
    name: Tests Unitaires Backend (Jest)
    runs-on: ubuntu-latest
    needs: lint-typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20.x', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter backend test:coverage
      - uses: actions/upload-artifact@v4
        with: { name: coverage-backend, path: apps/backend/coverage/ }

  integration:
    name: Tests Intégration (Supertest + Firestore Emulator)
    runs-on: ubuntu-latest
    needs: [unit-frontend, unit-backend]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20.x', cache: 'pnpm' }
      - uses: actions/setup-java@v4
        with: { distribution: 'temurin', java-version: '17' }
      - run: pnpm install --frozen-lockfile
      - run: npm install -g firebase-tools
      - name: Tests intégration avec émulateurs
        run: |
          firebase emulators:exec \
            --only firestore,auth \
            --project pos-lvmh-test \
            "pnpm --filter backend test:integration"
        env:
          FIRESTORE_EMULATOR_HOST: localhost:8080
          FIREBASE_AUTH_EMULATOR_HOST: localhost:9099
          JWT_ACCESS_PRIVATE_KEY: ${{ secrets.JWT_ACCESS_PRIVATE_KEY_TEST }}
          JWT_REFRESH_SECRET: ${{ secrets.JWT_REFRESH_SECRET_TEST }}

  e2e:
    name: Tests E2E (Playwright)
    runs-on: ubuntu-latest
    needs: integration
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20.x', cache: 'pnpm' }
      - uses: actions/setup-java@v4
        with: { distribution: 'temurin', java-version: '17' }
      - run: pnpm install --frozen-lockfile
      - run: npx playwright install --with-deps chromium firefox
      - run: pnpm --filter frontend build
        env: { VITE_API_BASE_URL: 'http://localhost:3001' }
      - name: E2E avec émulateurs
        run: |
          firebase emulators:exec \
            --only firestore,auth \
            --project pos-lvmh-test \
            "pnpm e2e:ci"
        env:
          E2E_BASE_URL: http://localhost:5173
          CI: true
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: playwright-report, path: playwright-report/, retention-days: 14 }
```

### `.github/workflows/deploy-staging.yml`

```yaml
name: Deploy Staging

on:
  push:
    branches: [develop]

jobs:
  deploy:
    name: Deploy Firebase Staging
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20.x', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter frontend build
        env:
          VITE_API_BASE_URL: ${{ secrets.STAGING_API_URL }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.STAGING_PROJECT_ID }}
      - run: pnpm --filter backend build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SA_STAGING }}
          projectId: ${{ secrets.STAGING_PROJECT_ID }}
          channelId: staging
      - run: firebase deploy --only functions --project ${{ secrets.STAGING_PROJECT_ID }}
        env: { FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN_STAGING }} }
```

### `.github/workflows/deploy-prod.yml`

```yaml
name: Deploy Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    name: Deploy Firebase Production
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20.x', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter frontend build
        env:
          VITE_API_BASE_URL: ${{ secrets.PROD_API_URL }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.PROD_PROJECT_ID }}
      - run: pnpm --filter backend build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SA_PROD }}
          projectId: ${{ secrets.PROD_PROJECT_ID }}
          channelId: live
      - run: firebase deploy --only functions --project ${{ secrets.PROD_PROJECT_ID }}
        env: { FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN_PROD }} }
```

---

## 7. Configuration des Outils de Test

### vitest.config.ts (Frontend)

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.stories.tsx', 'src/test-utils/**', 'src/main.tsx'],
      thresholds: {
        global: { statements: 80, branches: 75, functions: 80, lines: 80 },
        'src/stores/cartStore.ts': { statements: 95, branches: 90, functions: 95, lines: 95 },
        'src/stores/authStore.ts': { statements: 95, branches: 90, functions: 95, lines: 95 },
      },
    },
    reporters: ['verbose', ['junit', { outputFile: 'junit-frontend.xml' }]],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

### jest.config.ts (Backend)

```typescript
import type { Config } from 'jest';

export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: './src',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  setupFilesAfterFramework: ['<rootDir>/test-utils/setup.ts'],
  collectCoverageFrom: ['**/*.ts', '!**/*.d.ts', '!**/__tests__/**', '!**/index.ts'],
  coverageDirectory: '../coverage',
  coverageThresholds: {
    global: { statements: 85, branches: 80, functions: 85, lines: 85 },
    './services/auth.service.ts': { statements: 95, branches: 90, functions: 95, lines: 95 },
    './services/sales.service.ts': { statements: 95, branches: 90, functions: 95, lines: 95 },
    './middleware/authorize.ts': { statements: 95, branches: 90, functions: 95, lines: 95 },
  },
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: '..', outputName: 'junit-backend.xml' }],
  ],
} satisfies Config;
```

### Setup Files

```typescript
// src/test-setup.ts (Frontend)
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

global.fetch = vi.fn();

// Mock Service Worker
Object.defineProperty(navigator, 'serviceWorker', {
  value: { register: vi.fn().mockResolvedValue({}) },
  writable: true,
});

// Mock IndexedDB
vi.mock('../offline/db', () => ({
  db: {
    products: { toArray: vi.fn().mockResolvedValue([]), bulkPut: vi.fn() },
    cart: { get: vi.fn().mockResolvedValue(null), put: vi.fn(), delete: vi.fn() },
    pendingSales: {
      add: vi.fn(),
      orderBy: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
    },
  },
}));
```

```typescript
// src/test-utils/setup.ts (Backend)
process.env.JWT_ACCESS_PRIVATE_KEY =
  '-----BEGIN RSA PRIVATE KEY-----\n...test...\n-----END RSA PRIVATE KEY-----';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars!';
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.NODE_ENV = 'test';
process.env.ARGON2_TIME_COST = '1'; // Rapide en test
process.env.ARGON2_MEMORY_COST = '64'; // Minimum en test
```

---

## 8. Gestion des Données de Test

### Factories

```typescript
// e2e/fixtures/factories.ts
import { faker } from '@faker-js/faker/locale/fr';

export const TEST_USERS = {
  cashier: {
    id: 'u-cashier',
    email: 'caissier@lvmh.com',
    password: 'Cashier@2026!',
    role: 'CASHIER' as const,
  },
  manager: {
    id: 'u-manager',
    email: 'manager@lvmh.com',
    password: 'Manager@2026!',
    role: 'MANAGER' as const,
  },
  admin: {
    id: 'u-admin',
    email: 'admin@lvmh.com',
    password: 'Admin@2026!',
    role: 'ADMIN' as const,
  },
};

export const TEST_PRODUCTS = [
  {
    id: 'p-001',
    name: 'Chanel N°5 100ml',
    sku: 'CHA-N5-100',
    priceHT: 11250,
    vatRate: 0.2,
    stock: 20,
  },
  {
    id: 'p-002',
    name: 'Montre Santos',
    sku: 'CAR-SAN-001',
    priceHT: 58330,
    vatRate: 0.2,
    stock: 5,
  },
  {
    id: 'p-003',
    name: 'Article Hors Stock',
    sku: 'TEST-OOS',
    priceHT: 10000,
    vatRate: 0.2,
    stock: 0,
  },
];
```

---

## 9. Critères de Qualité et Gates CI

### Coverage Gates (Bloquants)

| Module                 | Statements | Branches | Functions | Lines |
| ---------------------- | ---------- | -------- | --------- | ----- |
| Frontend global        | 80%        | 75%      | 80%       | 80%   |
| Backend global         | 85%        | 80%      | 85%       | 85%   |
| `cartStore`            | 95%        | 90%      | 95%       | 95%   |
| `authStore`            | 95%        | 90%      | 95%       | 95%   |
| `authService`          | 95%        | 90%      | 95%       | 95%   |
| `salesService`         | 95%        | 90%      | 95%       | 95%   |
| `authorize` middleware | 95%        | 90%      | 95%       | 95%   |

### Règles ESLint Bloquantes

```json
{
  "vitest/no-focused-tests": "error",
  "vitest/no-disabled-tests": "error",
  "vitest/expect-expect": "error",
  "jest/no-focused-tests": "error",
  "no-eval": "error",
  "@typescript-eslint/no-explicit-any": "error",
  "import/no-cycle": "error"
}
```

### Branch Protection Rules (GitHub)

Required status checks avant merge :

- `Lint & TypeCheck`
- `Tests Unitaires Frontend (Vitest)`
- `Tests Unitaires Backend (Jest)`
- `Tests Intégration (Supertest + Firestore Emulator)`
- `Tests E2E (Playwright)`

Règles additionnelles :

- Min. 1 reviewer (2 pour modules auth/paiement)
- Dismiss stale reviews on new push
- Squash merge uniquement
- Aucun force push sur `main` ou `develop`

### Secrets GitHub Requis

| Secret                        | Usage                       | Scope      |
| ----------------------------- | --------------------------- | ---------- |
| `JWT_ACCESS_PRIVATE_KEY_TEST` | Tests intégration           | CI         |
| `JWT_REFRESH_SECRET_TEST`     | Tests intégration           | CI         |
| `FIREBASE_SA_STAGING`         | Deploy staging              | Staging    |
| `FIREBASE_SA_PROD`            | Deploy prod                 | Production |
| `FIREBASE_TOKEN_STAGING`      | CLI deploy staging          | Staging    |
| `FIREBASE_TOKEN_PROD`         | CLI deploy prod             | Production |
| `STAGING_API_URL`             | Build frontend staging      | Staging    |
| `STAGING_PROJECT_ID`          | Firebase project ID staging | Staging    |
| `PROD_API_URL`                | Build frontend prod         | Production |
| `PROD_PROJECT_ID`             | Firebase project ID prod    | Production |

---

_Document v1.0.0 — POS LVMH QA Strategy — 2026-02-20 — Expert QA_
_Référence : ISO/IEC 29119 — ISTQB Foundation Level_
