/**
 * Script de seed Firestore — Sprint 0 / Développement
 * Usage : npx ts-node scripts/seed.ts
 *
 * Crée des données de test pour le développement local avec l'émulateur.
 * NE PAS exécuter en production.
 */

import * as admin from 'firebase-admin';
import { UserRole, PaymentMethod, ProductCategory } from '@pos-lvmh/shared';

import { hashPassword } from '../apps/backend/src/utils/password';

// Connexion à l'émulateur
process.env['FIRESTORE_EMULATOR_HOST'] = 'localhost:8080';

admin.initializeApp({ projectId: 'pos-lvmh-dev' });
const db = admin.firestore();

// ── Données de seed ───────────────────────────────────────────────────────────

const STORE_ID = 'store-paris-001';
const NOW = admin.firestore.Timestamp.now();

async function seedStore(): Promise<void> {
  console.log('📍 Seeding store...');
  await db.collection('stores').doc(STORE_ID).set({
    name: 'LVMH Paris — Flagship',
    address: '22 Avenue Montaigne, 75008 Paris',
    country: 'FR',
    currency: 'EUR',
    timezone: 'Europe/Paris',
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  });
}

async function seedUsers(): Promise<void> {
  console.log('👥 Seeding users...');

  const users = [
    {
      id: 'user-admin-001',
      email: 'admin@pos-lvmh.com',
      firstName: 'Sophie',
      lastName: 'Martin',
      role: UserRole.ADMIN,
      password: 'Admin1234!',
    },
    {
      id: 'user-manager-001',
      email: 'manager@pos-lvmh.com',
      firstName: 'Pierre',
      lastName: 'Dupont',
      role: UserRole.MANAGER,
      password: 'Manager1234!',
    },
    {
      id: 'user-cashier-001',
      email: 'caissier@pos-lvmh.com',
      firstName: 'Marie',
      lastName: 'Leblanc',
      role: UserRole.CASHIER,
      password: 'Cashier1234!',
    },
  ];

  for (const user of users) {
    const { password, ...userData } = user;
    const passwordHash = await hashPassword(password);

    await db
      .collection('users')
      .doc(user.id)
      .set({
        ...userData,
        passwordHash,
        storeId: STORE_ID,
        isActive: true,
        loginAttempts: 0,
        lockedUntil: null,
        createdAt: NOW,
        updatedAt: NOW,
        lastLoginAt: null,
      });
    console.log(`  ✓ User ${user.email} (${user.role})`);
  }
}

async function seedProducts(): Promise<void> {
  console.log('📦 Seeding products...');

  const products = [
    {
      id: 'prod-001',
      sku: 'LV-SCF-001',
      name: 'Foulard en soie Louis Vuitton',
      brand: 'Louis Vuitton',
      category: ProductCategory.CLOTHING,
      description: 'Foulard en soie imprimé motif monogramme, 90x90cm',
      priceHT: 28000, // 280,00 € en centimes
      vatRate: 20,
      imageUrl: 'https://storage.googleapis.com/pos-lvmh-dev/products/lv-scarf.jpg',
      isActive: true,
    },
    {
      id: 'prod-002',
      sku: 'DI-BAG-001',
      name: 'Sac Lady Dior',
      brand: 'Dior',
      category: ProductCategory.CLOTHING,
      description: 'Sac Lady Dior en cuir cannage noir, taille moyenne',
      priceHT: 291667, // 3500,00 € TTC → 2916,67 € HT
      vatRate: 20,
      imageUrl: 'https://storage.googleapis.com/pos-lvmh-dev/products/dior-bag.jpg',
      isActive: true,
    },
    {
      id: 'prod-003',
      sku: 'GU-WAT-001',
      name: 'Montre TAG Heuer Carrera',
      brand: 'TAG Heuer',
      category: ProductCategory.WATCHES,
      description: 'Montre chronographe automatique, boîtier 42mm acier',
      priceHT: 283333, // 3400,00 € TTC → 2833,33 € HT
      vatRate: 20,
      imageUrl: 'https://storage.googleapis.com/pos-lvmh-dev/products/tag-watch.jpg',
      isActive: true,
    },
    {
      id: 'prod-004',
      sku: 'PF-GIV-001',
      name: "L'Interdit Givenchy EDP",
      brand: 'Givenchy',
      category: ProductCategory.PERFUME,
      description: 'Eau de Parfum, 80ml — Notes florales et boisées',
      priceHT: 9917, // 119,00 € TTC → 99,17 € HT
      vatRate: 20,
      imageUrl: 'https://storage.googleapis.com/pos-lvmh-dev/products/givenchy-edp.jpg',
      isActive: true,
    },
    {
      id: 'prod-005',
      sku: 'PF-LV-001',
      name: 'Ombre Nomade Louis Vuitton',
      brand: 'Louis Vuitton',
      category: ProductCategory.PERFUME,
      description: 'Parfum de collection, 100ml — Oud et bois de santal',
      priceHT: 29167, // 350,00 € TTC → 291,67 € HT
      vatRate: 20,
      imageUrl: 'https://storage.googleapis.com/pos-lvmh-dev/products/lv-ombre.jpg',
      isActive: true,
    },
  ];

  const batch = db.batch();

  for (const product of products) {
    const ref = db.collection('products').doc(product.id);
    batch.set(ref, {
      ...product,
      createdAt: NOW,
      updatedAt: NOW,
      createdBy: 'user-admin-001',
    });

    // Stock initial
    const stockRef = db.collection('stores').doc(STORE_ID).collection('stock').doc(product.id);
    batch.set(stockRef, {
      productId: product.id,
      quantity: 10,
      minQuantity: 2,
      updatedAt: NOW,
    });

    console.log(`  ✓ Product ${product.sku} — ${product.name}`);
  }

  await batch.commit();
}

async function seedClients(): Promise<void> {
  console.log('👤 Seeding clients...');

  const clients = [
    {
      id: 'client-001',
      firstName: 'Isabelle',
      lastName: 'Fontaine',
      email: 'isabelle.fontaine@example.com',
      phone: '+33 6 12 34 56 78',
      preferredLanguage: 'fr',
      nationality: 'FR',
      totalPurchases: 0,
      totalSpent: 0,
    },
    {
      id: 'client-002',
      firstName: 'James',
      lastName: 'Harrington',
      email: 'j.harrington@example.com',
      phone: '+44 7700 900123',
      preferredLanguage: 'en',
      nationality: 'GB',
      totalPurchases: 0,
      totalSpent: 0,
    },
  ];

  const batch = db.batch();
  for (const client of clients) {
    const ref = db.collection('clients').doc(client.id);
    batch.set(ref, { ...client, createdAt: NOW, updatedAt: NOW });
    console.log(`  ✓ Client ${client.firstName} ${client.lastName}`);
  }
  await batch.commit();
}

// ── Exécution ─────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('\n🌱 Starting Firestore seed...\n');

  try {
    await seedStore();
    await seedUsers();
    await seedProducts();
    await seedClients();

    console.log('\n✅ Seed completed successfully!');
    console.log('\nTest credentials:');
    console.log('  Admin   : admin@pos-lvmh.com / Admin1234!');
    console.log('  Manager : manager@pos-lvmh.com / Manager1234!');
    console.log('  Cashier : caissier@pos-lvmh.com / Cashier1234!');
  } catch (err) {
    console.error('\n❌ Seed failed:', err);
    process.exit(1);
  }
}

main();
