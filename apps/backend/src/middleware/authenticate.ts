import type { Request, Response, NextFunction } from 'express';

import type { AccessTokenPayload } from '@/utils/token';
import { verifyAccessToken } from '@/utils/token';
import { AppError, ErrorCode } from '@/utils/errors';
import { getFirestore } from '@/config/firebase';

// Augmentation du type Request pour y attacher l'utilisateur authentifié

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw AppError.unauthorized('Missing or malformed Authorization header');
    }

    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);

    // Vérifier si le token est révoqué (logout forcé, rotation)
    const db = getFirestore();
    const revokedRef = db.collection('revokedTokens').doc(payload.sub);
    const revokedDoc = await revokedRef.get();

    if (revokedDoc.exists) {
      const data = revokedDoc.data();
      // Révocation partielle : comparer l'iat du token avec le timestamp de révocation
      if (data?.['revokedAt'] && payload.iat && payload.iat < data['revokedAt']) {
        throw new AppError('Token has been revoked', 401, ErrorCode.TOKEN_REVOKED);
      }
    }

    req.user = payload;
    next();
  } catch (err) {
    next(err);
  }
}
