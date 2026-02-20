/**
 * Serveur de développement local (hors Firebase Functions).
 * Lance l'app Express directement sur le port configuré.
 * Utilisé avec : pnpm dev (via ts-node-dev)
 */
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

// Initialise Firebase (pointe vers l'émulateur si FIRESTORE_EMULATOR_HOST est défini)
import './config/firebase';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Dev server running on http://localhost:${env.PORT}`);
  logger.info(`📡 Environment: ${env.NODE_ENV}`);

  if (process.env['FIRESTORE_EMULATOR_HOST']) {
    logger.info(`🔥 Firestore Emulator: ${process.env['FIRESTORE_EMULATOR_HOST']}`);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down...');
  server.close(() => {
    process.exit(0);
  });
});
