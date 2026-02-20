import rateLimit from 'express-rate-limit';

import { AppError, ErrorCode } from '@/utils/errors';

/** Rate limiter général pour toutes les routes API */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(
      new AppError('Too many requests, please try again later', 429, ErrorCode.SERVICE_UNAVAILABLE),
    );
  },
});

/** Rate limiter strict pour les routes d'authentification */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Ne compte que les échecs
  handler: (_req, _res, next) => {
    next(
      new AppError(
        'Too many login attempts, please wait 15 minutes',
        429,
        ErrorCode.ACCOUNT_LOCKED,
      ),
    );
  },
});
