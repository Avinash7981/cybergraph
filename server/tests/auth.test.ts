import { describe, it, expect, vi, beforeEach } from 'vitest';
import { register, login, me, logout } from '../src/controllers/authController';
import type { Request, Response } from 'express';
import prisma from '../src/services/prisma';
import { authService } from '../src/services/authService';

vi.mock('../src/services/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('../src/services/authService', () => ({
  authService: {
    hashPassword: vi.fn(),
    verifyPassword: vi.fn(),
    generateToken: vi.fn(),
    verifyToken: vi.fn(),
  },
}));

describe('Auth Controller', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: any;
  let statusMock: any;
  let cookieMock: any;
  let clearCookieMock: any;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    cookieMock = vi.fn();
    clearCookieMock = vi.fn();
    req = { body: {} };
    res = { status: statusMock, json: jsonMock, cookie: cookieMock, clearCookie: clearCookieMock };
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('requires name, email, password', async () => {
      await register(req as Request, res as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('creates user and sets cookie', async () => {
      req.body = { name: 'Test', email: 'test@example.com', password: 'password' };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(authService.hashPassword).mockResolvedValue('hash');
      vi.mocked(prisma.user.create).mockResolvedValue({ id: '1', name: 'Test', email: 'test@example.com', role: 'USER' } as any);
      vi.mocked(authService.generateToken).mockReturnValue('token');

      await register(req as Request, res as Response);

      expect(cookieMock).toHaveBeenCalledWith('token', 'token', expect.any(Object));
      expect(jsonMock).toHaveBeenCalledWith({ id: '1', name: 'Test', email: 'test@example.com', role: 'USER' });
    });
  });

  describe('login', () => {
    it('returns 401 on invalid email', async () => {
      req.body = { email: 'wrong@test.com', password: 'password' };
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await login(req as Request, res as Response);

      expect(statusMock).toHaveBeenCalledWith(401);
    });
  });

  describe('logout', () => {
    it('clears cookie', async () => {
      await logout(req as Request, res as Response);
      expect(clearCookieMock).toHaveBeenCalledWith('token');
      expect(jsonMock).toHaveBeenCalledWith({ success: true });
    });
  });
});
