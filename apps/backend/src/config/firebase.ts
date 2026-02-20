import * as admin from 'firebase-admin';

let app: admin.app.App;

export function getFirebaseApp(): admin.app.App {
  if (app) return app;

  if (admin.apps.length > 0) {
    app = admin.apps[0]!;
    return app;
  }

  // En émulateur local ou test
  if (process.env['FIRESTORE_EMULATOR_HOST'] || process.env['NODE_ENV'] === 'test') {
    app = admin.initializeApp({
      projectId: process.env['FIREBASE_PROJECT_ID'] ?? 'pos-lvmh-dev',
    });
  } else {
    // Production : utilise les credentials ADC (Application Default Credentials)
    app = admin.initializeApp();
  }

  return app;
}

export function getFirestore(): admin.firestore.Firestore {
  return getFirebaseApp().firestore();
}

export function getAuth(): admin.auth.Auth {
  return getFirebaseApp().auth();
}
