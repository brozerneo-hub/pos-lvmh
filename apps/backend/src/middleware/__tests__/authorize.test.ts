import type { NextFunction, Request, Response } from 'express';

import { UserRole } from '@pos-lvmh/shared';

import { AppError } from '@/utils/errors';
import { authorize } from '../authorize';

function makeReq(role?: UserRole): Request {
  const user = role ? { sub: 'u1', email: 'x@x.com', role, storeId: 's1' } : undefined;
  return { user } as unknown as Request;
}

const res = {} as Response;

function nextFn(): NextFunction & jest.Mock {
  return jest.fn() as NextFunction & jest.Mock;
}

describe('authorize - sans utilisateur', () => {
  it('appelle next avec AppError 401 si req.user est absent', () => {
    const next = nextFn();
    authorize(UserRole.CASHIER)(makeReq(), res, next);
    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
  });
});

describe('authorize - role CASHIER requis', () => {
  it('CASHIER -> autorise', () => {
    const next = nextFn();
    authorize(UserRole.CASHIER)(makeReq(UserRole.CASHIER), res, next);
    expect(next).toHaveBeenCalledWith();
  });
  it('MANAGER -> autorise', () => {
    const next = nextFn();
    authorize(UserRole.CASHIER)(makeReq(UserRole.MANAGER), res, next);
    expect(next).toHaveBeenCalledWith();
  });
  it('ADMIN -> autorise', () => {
    const next = nextFn();
    authorize(UserRole.CASHIER)(makeReq(UserRole.ADMIN), res, next);
    expect(next).toHaveBeenCalledWith();
  });
});

describe('authorize - role MANAGER requis', () => {
  it('CASHIER -> 403 Forbidden', () => {
    const next = nextFn();
    authorize(UserRole.MANAGER)(makeReq(UserRole.CASHIER), res, next);
    const err = next.mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(403);
  });
  it('MANAGER -> autorise', () => {
    const next = nextFn();
    authorize(UserRole.MANAGER)(makeReq(UserRole.MANAGER), res, next);
    expect(next).toHaveBeenCalledWith();
  });
  it('ADMIN -> autorise', () => {
    const next = nextFn();
    authorize(UserRole.MANAGER)(makeReq(UserRole.ADMIN), res, next);
    expect(next).toHaveBeenCalledWith();
  });
});

describe('authorize - role ADMIN requis', () => {
  it('CASHIER -> 403 Forbidden', () => {
    const next = nextFn();
    authorize(UserRole.ADMIN)(makeReq(UserRole.CASHIER), res, next);
    const err = next.mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(403);
  });
  it('MANAGER -> 403 Forbidden', () => {
    const next = nextFn();
    authorize(UserRole.ADMIN)(makeReq(UserRole.MANAGER), res, next);
    const err = next.mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(403);
  });
  it('ADMIN -> autorise', () => {
    const next = nextFn();
    authorize(UserRole.ADMIN)(makeReq(UserRole.ADMIN), res, next);
    expect(next).toHaveBeenCalledWith();
  });
});

describe("authorize - message d'erreur", () => {
  it('inclut le role requis dans le message 403', () => {
    const next = nextFn();
    authorize(UserRole.ADMIN)(makeReq(UserRole.CASHIER), res, next);
    const err = next.mock.calls[0][0] as AppError;
    expect(err.message).toContain(UserRole.ADMIN);
  });
});
