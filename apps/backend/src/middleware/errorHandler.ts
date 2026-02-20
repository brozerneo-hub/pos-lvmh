import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

import { AppError, ErrorCode } from '@/utils/errors';
import { logger } from '@/utils/logger';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  // Erreurs de validation Zod
  if (err instanceof ZodError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Validation failed',
        details: err.flatten().fieldErrors,
      },
    };
    res.status(422).json(response);
    return;
  }

  // Erreurs applicatives connues
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, req }, 'Application error');
    } else {
      logger.warn({ err: err.message, code: err.code, path: req.path }, 'Client error');
    }

    const response: ErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined && { details: err.details }),
      },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Erreurs inattendues
  logger.error({ err, req }, 'Unhandled error');

  res.status(500).json({
    success: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'An unexpected error occurred',
    },
  } satisfies ErrorResponse);
}
