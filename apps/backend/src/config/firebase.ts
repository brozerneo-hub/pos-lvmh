import * as admin from 'firebase-admin';

let app: admin.app.App;

export function getFirebaseApp(): admin.app.App {
  if (app) return app;

  if (admin.apps.length > 0) {
    app = admin.apps[0]!;
    return app;
  }

  // Dev/test : émulateur local
  if (process.env['FIRESTORE_EMULATOR_HOST'] || process.env['NODE_ENV'] === 'test') {
    app = admin.initializeApp({
      projectId: process.env['FIREBASE_PROJECT_ID'] ?? 'pos-lvmh-dev',
    });
  } else if (process.env['FIREBASE_SERVICE_ACCOUNT']) {
    // Production (Render) : service account JSON stocké en variable d'environnement
    const serviceAccount = JSON.parse(
      process.env['FIREBASE_SERVICE_ACCOUNT'],
    ) as admin.ServiceAccount;
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // Fallback : Application Default Credentials (GCP natif)
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
