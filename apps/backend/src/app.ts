import type { Application } from 'express';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { env } from '@/config/env';
import { apiLimiter } from '@/middleware/rateLimiter';
import { errorHandler } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';

import { authRouter } from '@/routes/auth.routes';
// import { productsRouter } from '@/routes/products.routes';
// import { productsRouter } from '@/routes/products.routes';
// import { salesRouter }    from '@/routes/sales.routes';
// import { clientsRouter }  from '@/routes/clients.routes';
// import { stockRouter }    from '@/routes/stock.routes';
// import { usersRouter }    from '@/routes/users.routes';

export function createApp(): Application {
  const app = express();

  // ── Sécurité ──────────────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https://storage.googleapis.com'],
        },
      },
    }),
  );

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // ── Body parsing ───────────────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Cookie parsing léger sans dépendance externe
  app.use((req, _res, next) => {
    const raw = req.headers.cookie ?? '';
    req.cookies = Object.fromEntries(
      raw
        .split(';')
        .filter(Boolean)
        .map((c) => c.trim().split('=').map(decodeURIComponent)),
    );
    next();
  });

  // ── Rate limiting global ───────────────────────────────────────────────────
  app.use('/api', apiLimiter);

  // ── Health check ──────────────────────────────────────────────────────────
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ── Routes applicatives ───────────────────────────────────────────────────
  app.use('/api/auth', authRouter);
  // app.use('/api/products', productsRouter);
  // app.use('/api/sales',    salesRouter);
  // app.use('/api/clients',  clientsRouter);
  // app.use('/api/stock',    stockRouter);
  // app.use('/api/users',    usersRouter);

  // ── 404 ────────────────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    });
  });

  // ── Error handler (doit être le dernier middleware) ────────────────────────
  app.use(errorHandler);

  logger.debug('Express app created');

  return app;
}
