# POS LVMH — Point of Sale System

> Système de caisse luxe pour le groupe LVMH — Application web PWA, offline-first, multi-boutiques.

## Architecture

```
pos-lvmh/
├── apps/
│   ├── frontend/        # React 18 + Vite + PWA (Vitest)
│   └── backend/         # Express → Firebase Functions 2nd gen (Jest)
├── packages/
│   └── shared/          # Types, schemas Zod et constantes partagés
├── architecture/        # Documents d'architecture (ADR, diagrammes)
├── scripts/             # Scripts utilitaires (seed, etc.)
└── .github/workflows/   # CI/CD GitHub Actions
```

**Stack :** React 18 · TypeScript strict · Zustand · TanStack Query · Tailwind CSS · Vite PWA
**Backend :** Node.js 20 · Express · Firebase Functions 2nd gen · Firestore · Argon2id · JWT RS256
**Tooling :** pnpm workspaces · Turborepo · ESLint 9 · Prettier · Husky · Conventional Commits

## Prérequis

| Outil        | Version          |
| ------------ | ---------------- |
| Node.js      | 20.x             |
| pnpm         | 9.x              |
| Firebase CLI | 13.x             |
| Java         | 17+ (émulateurs) |

```bash
npm install -g pnpm firebase-tools
```

## Démarrage rapide

### 1. Installation

```bash
git clone https://github.com/votre-org/pos-lvmh.git
cd pos-lvmh
pnpm install
```

### 2. Configuration

```bash
cp apps/backend/.env.example apps/backend/.env
# Éditer apps/backend/.env avec vos valeurs
```

### 3. Lancer les émulateurs Firebase

```bash
firebase emulators:start
# Interface émulateurs : http://localhost:4000
```

### 4. Seed des données de test

```bash
npx ts-node scripts/seed.ts
```

### 5. Lancer le développement

```bash
# Terminal 1 — Backend (Express dev server)
pnpm --filter backend dev

# Terminal 2 — Frontend (Vite)
pnpm --filter frontend dev

# Ou tout en parallèle avec Turborepo
pnpm dev
```

**URLs de développement :**

- Frontend : http://localhost:5173
- Backend API : http://localhost:3001/api
- Firebase Emulator UI : http://localhost:4000

## Comptes de test (après seed)

| Rôle     | Email                 | Mot de passe |
| -------- | --------------------- | ------------ |
| Admin    | admin@pos-lvmh.com    | Admin1234!   |
| Manager  | manager@pos-lvmh.com  | Manager1234! |
| Caissier | caissier@pos-lvmh.com | Cashier1234! |

## Scripts disponibles

```bash
# Développement
pnpm dev                    # Lance frontend + backend en parallèle
pnpm --filter frontend dev  # Frontend seul
pnpm --filter backend dev   # Backend seul

# Build
pnpm build                  # Build tous les packages

# Tests
pnpm test                   # Tests unitaires
pnpm test:coverage          # Tests avec couverture de code

# Qualité
pnpm lint                   # ESLint
pnpm typecheck              # TypeScript (sans émettre)
pnpm format                 # Prettier

# Nettoyage
pnpm clean                  # Supprime dist/ et coverage/
```

## Plan de livraison (MVP — 5 sprints)

| Sprint       | Durée      | Contenu                                 |
| ------------ | ---------- | --------------------------------------- |
| **Sprint 0** | 1 semaine  | Setup monorepo, shared, infra, CI/CD ✅ |
| **Sprint 1** | 2 semaines | Auth (login, JWT, RBAC, refresh)        |
| **Sprint 2** | 2 semaines | Catalogue produits + Caisse POS         |
| **Sprint 3** | 2 semaines | Ventes, clients, stock                  |
| **Sprint 4** | 2 semaines | Offline PWA, sync, rapports manager     |

## Sécurité

- Mots de passe hachés avec **Argon2id** (64 MiB, timeCost 3, parallelism 4)
- Access token **JWT HS256** — 15 min, stocké en mémoire uniquement
- Refresh token **JWT HS256** — 8h, httpOnly cookie (SameSite=Strict)
- Verrouillage compte après **5 tentatives** échouées (30 min)
- **Firestore Security Rules** — deny-all par défaut, accès par rôle
- **Helmet** CSP + CORS strict
- Rate limiting : 200 req/15min global, 10/15min sur /auth

## Variables d'environnement

Voir `apps/backend/.env.example` pour la liste complète.

Les secrets sont stockés dans **GitHub Secrets** et les **Firebase Secret Manager** en production.
Ne jamais committer de fichiers `.env` ou de service accounts.

## Contribution

1. Créer une branche depuis `develop` : `git checkout -b feat/scope/description`
2. Commits en Conventional Commits : `feat(auth): add refresh token rotation`
3. Ouvrir une PR vers `develop`
4. CI doit passer (lint + typecheck + tests)
5. Review par au moins 1 autre développeur

---

_POS LVMH v0.1.0 — Sébastien Zamboni — Février 2026_
