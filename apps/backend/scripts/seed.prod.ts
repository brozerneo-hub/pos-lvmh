/**
 * Seed script pour la base Firebase de PRODUCTION.
 * Usage :
 *   GOOGLE_APPLICATION_CREDENTIALS="chemin/vers/key.json" pnpm --filter backend seed:prod
 */

import * as admin from 'firebase-admin';
import { UserRole, ProductCategory } from '@pos-lvmh/shared';
import { hashPassword } from '../src/utils/password';

// Connexion à Firebase Production via GOOGLE_APPLICATION_CREDENTIALS
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'boomerintech-pos',
});

const db = admin.firestore();
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
    console.log(`  ✓ ${user.email} (${user.role})`);
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
      priceHT: 28000,
      vatRate: 20,
    },
    {
      id: 'prod-002',
      sku: 'DI-BAG-001',
      name: 'Sac Lady Dior',
      brand: 'Dior',
      category: ProductCategory.CLOTHING,
      priceHT: 291667,
      vatRate: 20,
    },
    {
      id: 'prod-003',
      sku: 'GU-WAT-001',
      name: 'Montre TAG Heuer Carrera',
      brand: 'TAG Heuer',
      category: ProductCategory.WATCHES,
      priceHT: 283333,
      vatRate: 20,
    },
    {
      id: 'prod-004',
      sku: 'PF-GIV-001',
      name: "L'Interdit Givenchy EDP",
      brand: 'Givenchy',
      category: ProductCategory.PERFUME,
      priceHT: 9917,
      vatRate: 20,
    },
    {
      id: 'prod-005',
      sku: 'PF-LV-001',
      name: 'Ombre Nomade Louis Vuitton',
      brand: 'Louis Vuitton',
      category: ProductCategory.PERFUME,
      priceHT: 29167,
      vatRate: 20,
    },
  ];
  const batch = db.batch();
  for (const product of products) {
    batch.set(db.collection('products').doc(product.id), {
      ...product,
      description: '',
      imageUrl: '',
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
      createdBy: 'user-admin-001',
    });
    batch.set(db.collection('stores').doc(STORE_ID).collection('stock').doc(product.id), {
      productId: product.id,
      quantity: 10,
      minQuantity: 2,
      updatedAt: NOW,
    });
    console.log(`  ✓ ${product.sku} — ${product.name}`);
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
      nationality: 'FR',
    },
    {
      id: 'client-002',
      firstName: 'James',
      lastName: 'Harrington',
      email: 'j.harrington@example.com',
      phone: '+44 7700 900123',
      nationality: 'GB',
    },
  ];
  const batch = db.batch();
  for (const client of clients) {
    batch.set(db.collection('clients').doc(client.id), {
      ...client,
      preferredLanguage: client.nationality === 'FR' ? 'fr' : 'en',
      totalPurchases: 0,
      totalSpent: 0,
      createdAt: NOW,
      updatedAt: NOW,
    });
    console.log(`  ✓ ${client.firstName} ${client.lastName}`);
  }
  await batch.commit();
}

async function main(): Promise<void> {
  console.log('\n🌱 Seeding PRODUCTION Firebase (boomerintech-pos)...\n');
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
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Seed failed:', err);
    process.exit(1);
  }
}

main();
