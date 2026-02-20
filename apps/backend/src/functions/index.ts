import * as functions from 'firebase-functions/v2/https';

import { createApp } from '@/app';
import { getFirebaseApp } from '@/config/firebase';
import { logger } from '@/utils/logger';

// Initialise Firebase au démarrage (cold start)
getFirebaseApp();

const app = createApp();

/**
 * Cloud Function principale — toutes les routes Express sont exposées sous /api
 * Region : europe-west1 (Paris) pour la conformité RGPD LVMH
 */
export const api = functions.onRequest(
  {
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 60,
    minInstances: 0,
    maxInstances: 100,
    concurrency: 80,
    invoker: 'public',
    cors: false, // Géré par Express/helmet
  },
  (req, res) => {
    logger.debug({ method: req.method, path: req.path }, 'Incoming request');
    app(req, res);
  },
);
