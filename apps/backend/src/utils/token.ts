import jwt from 'jsonwebtoken';
import type { UserRole } from '@pos-lvmh/shared';

import { AppError, ErrorCode } from './errors';

import { env } from '@/config/env';

export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
  role: UserRole;
  storeId: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string; // userId
  jti: string; // JWT ID — for revocation
  iat?: number;
  exp?: number;
}

export function signAccessToken(payload: Omit<AccessTokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: '15m',
    algorithm: 'HS256',
  });
}

export function signRefreshToken(userId: string, jti: string): string {
  return jwt.sign({ sub: userId, jti }, env.JWT_REFRESH_SECRET, {
    expiresIn: '8h',
    algorithm: 'HS256',
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
    }) as AccessTokenPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError('Access token expired', 401, ErrorCode.TOKEN_EXPIRED);
    }
    throw new AppError('Invalid access token', 401, ErrorCode.TOKEN_INVALID);
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET, {
      algorithms: ['HS256'],
    }) as RefreshTokenPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError('Refresh token expired', 401, ErrorCode.TOKEN_EXPIRED);
    }
    throw new AppError('Invalid refresh token', 401, ErrorCode.TOKEN_INVALID);
  }
}
