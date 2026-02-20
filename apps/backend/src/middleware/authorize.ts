import type { Request, Response, NextFunction } from 'express';
import type { UserRole } from '@pos-lvmh/shared';
import { ROLE_HIERARCHY } from '@pos-lvmh/shared';

import { AppError } from '@/utils/errors';

/**
 * Middleware de contrôle d'accès basé sur les rôles (RBAC).
 * Vérifie que l'utilisateur authentifié a au moins le rôle requis.
 */
export function authorize(minRole: UserRole) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }

    const userLevel = ROLE_HIERARCHY[req.user.role];
    const requiredLevel = ROLE_HIERARCHY[minRole];

    if (userLevel < requiredLevel) {
      next(AppError.forbidden(`Role ${minRole} or higher required`));
      return;
    }

    next();
  };
}
