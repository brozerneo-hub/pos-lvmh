import type { Request, Response } from 'express';

jest.mock('@/utils/token');
jest.mock('@/config/firebase');

import { getFirestore } from '@/config/firebase';
import { AppError, ErrorCode } from '@/utils/errors';
import { verifyAccessToken } from '@/utils/token';
import { UserRole } from '@pos-lvmh/shared';
import { authenticate } from '../authenticate';

const mockVerifyAccessToken = jest.mocked(verifyAccessToken);
const mockGetFirestore = jest.mocked(getFirestore);

const VALID_PAYLOAD = {
  sub: 'user-123',
  email: 'alice@lvmh.com',
  role: UserRole.CASHIER,
  storeId: 'store-paris',
  iat: 1700000100,
};

function makeReq(authorization?: string): Request {
  return { headers: { authorization }, cookies: {} } as unknown as Request;
}

const res = {} as Response;

function nextFn(): jest.Mock {
  return jest.fn();
}

function makeDb(revokedDoc: { exists: boolean; data?: () => Record<string, unknown> }) {
  return {
    collection: jest.fn().mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue(revokedDoc),
      }),
    }),
  } as unknown as ReturnType<typeof getFirestore>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockVerifyAccessToken.mockReturnValue(VALID_PAYLOAD);
  mockGetFirestore.mockReturnValue(makeDb({ exists: false }));
});

describe('authenticate - en-tete manquant / malforme', () => {
  it('appelle next(AppError 401) si Authorization absent', async () => {
    const next = nextFn();
    await authenticate(makeReq(), res, next);
    const err = next.mock.calls[0][0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
  });

  it('appelle next(AppError 401) si Authorization ne commence pas par "Bearer "', async () => {
    const next = nextFn();
    await authenticate(makeReq('Basic abc123'), res, next);
    const err = next.mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(401);
  });
});

describe('authenticate - token invalide', () => {
  it("propage l'erreur si verifyAccessToken leve TOKEN_EXPIRED", async () => {
    mockVerifyAccessToken.mockImplementation(() => {
      throw new AppError('Access token expired', 401, ErrorCode.TOKEN_EXPIRED);
    });
    const next = nextFn();
    await authenticate(makeReq('Bearer expired.token'), res, next);
    const err = next.mock.calls[0][0] as AppError;
    expect(err.code).toBe(ErrorCode.TOKEN_EXPIRED);
    expect(err.statusCode).toBe(401);
  });

  it("propage l'erreur si verifyAccessToken leve TOKEN_INVALID", async () => {
    mockVerifyAccessToken.mockImplementation(() => {
      throw new AppError('Invalid access token', 401, ErrorCode.TOKEN_INVALID);
    });
    const next = nextFn();
    await authenticate(makeReq('Bearer bad.token'), res, next);
    const err = next.mock.calls[0][0] as AppError;
    expect(err.code).toBe(ErrorCode.TOKEN_INVALID);
  });
});

describe('authenticate - token revoque', () => {
  it('appelle next(AppError TOKEN_REVOKED) si iat < revokedAt', async () => {
    mockGetFirestore.mockReturnValue(
      makeDb({ exists: true, data: () => ({ revokedAt: 1700000200 }) }),
    );
    const next = nextFn();
    await authenticate(makeReq('Bearer valid.token'), res, next);
    const err = next.mock.calls[0][0] as AppError;
    expect(err.code).toBe(ErrorCode.TOKEN_REVOKED);
    expect(err.statusCode).toBe(401);
  });

  it('laisse passer si iat >= revokedAt', async () => {
    mockGetFirestore.mockReturnValue(
      makeDb({ exists: true, data: () => ({ revokedAt: 1700000050 }) }),
    );
    const next = nextFn();
    const req = makeReq('Bearer valid.token');
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual(VALID_PAYLOAD);
  });
});

describe('authenticate - token valide', () => {
  it('attache req.user et appelle next() sans argument', async () => {
    const next = nextFn();
    const req = makeReq('Bearer valid.token');
    await authenticate(req, res, next);
    expect(req.user).toEqual(VALID_PAYLOAD);
    expect(next).toHaveBeenCalledWith();
  });

  it('extrait le token correctement (supprime "Bearer ")', async () => {
    await authenticate(makeReq('Bearer my.jwt.token'), res, nextFn());
    expect(mockVerifyAccessToken).toHaveBeenCalledWith('my.jwt.token');
  });
});
