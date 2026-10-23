import type { NextFunction, Request, Response } from 'express';
import { requireAdmin, requireAuth } from '../../../src/middlewares/require-auth';
import { findUserBySessionToken } from '../../../src/repositories/auth';
import { ForbiddenError, UnauthorizedError } from '../../../src/utils/errors';
import { hashToken } from '../../../src/utils/token';
import { admin, member } from '../services/fixtures';

jest.mock('../../../src/repositories/auth');

const mockedFind = jest.mocked(findUserBySessionToken);

function makeRequest(cookie?: string): Request {
  return { headers: cookie ? { cookie } : {} } as Request;
}

function makeResponse(): Response {
  return { locals: {} } as Response;
}

describe('requireAuth', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('rejects a request without a session cookie', async () => {
    const next = jest.fn();
    await expect(requireAuth(makeRequest('other=1'), makeResponse(), next)).rejects.toBeInstanceOf(UnauthorizedError);
    expect(next).not.toHaveBeenCalled();
    expect(mockedFind).not.toHaveBeenCalled();
  });

  it('rejects an unknown or expired token (the repository finds no live session)', async () => {
    mockedFind.mockResolvedValue(null);
    await expect(requireAuth(makeRequest('session=abc'), makeResponse(), jest.fn())).rejects.toBeInstanceOf(UnauthorizedError);
    expect(mockedFind).toHaveBeenCalledWith(hashToken('abc'));
  });

  it('sets res.locals.user for a valid member session', async () => {
    mockedFind.mockResolvedValue(member);
    const res = makeResponse();
    const next = jest.fn();

    await requireAuth(makeRequest('theme=dark; session=abc'), res, next);

    expect(res.locals.user).toBe(member);
    expect(res.locals.sessionTokenHash).toBe(hashToken('abc'));
    expect(next).toHaveBeenCalledWith();
  });
});

describe('requireAdmin', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('lets an admin through', async () => {
    mockedFind.mockResolvedValue(admin);
    const next: NextFunction = jest.fn();
    await requireAdmin(makeRequest('session=abc'), makeResponse(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it('returns 403 FORBIDDEN for a member', async () => {
    mockedFind.mockResolvedValue(member);
    const next = jest.fn();
    await expect(requireAdmin(makeRequest('session=abc'), makeResponse(), next)).rejects.toBeInstanceOf(ForbiddenError);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when logged out', async () => {
    await expect(requireAdmin(makeRequest(), makeResponse(), jest.fn())).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
