import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { ZodError } from 'zod';

type ValidateTarget = 'body' | 'query' | 'params';

/**
 * Middleware de validation Zod générique.
 * Valide la cible (body/query/params) et remplace la valeur par la version parsée (coercée).
 */
export function validate<T>(schema: ZodSchema<T>, target: ValidateTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[target]);
      // Remplace par la valeur parsée (trim, coercion, defaults appliqués)
      (req as unknown as Record<string, unknown>)[target] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(err);
      } else {
        next(err);
      }
    }
  };
}
