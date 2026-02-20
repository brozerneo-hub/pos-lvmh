/**
 * Setup global pour les tests Jest (backend).
 * Référencé dans jest.config.ts → setupFiles.
 * Ce fichier s'exécute AVANT le framework de test — pas de beforeAll/afterEach ici.
 */
import * as admin from 'firebase-admin';

// Variables d'environnement pour les tests
process.env['NODE_ENV'] = 'test';
process.env['JWT_ACCESS_SECRET'] = 'test-access-secret-min-32-characters!!';
process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret-min-32-characters!';
process.env['FIREBASE_PROJECT_ID'] = 'pos-lvmh-test';
process.env['FIRESTORE_EMULATOR_HOST'] = 'localhost:8080';

// Initialise Firebase Admin une seule fois pour tous les tests
if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: 'pos-lvmh-test',
  });
}
