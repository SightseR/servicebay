import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService, hashToken, ttlToMs } from './auth.service';

const SECRET_A = 'a'.repeat(40);
const SECRET_R = 'r'.repeat(40);
const SID = '99999999-9999-4999-8999-999999999999';

const baseUser = async (over: Partial<Record<string, unknown>> = {}) => ({
  id: '11111111-1111-4111-8111-111111111111',
  email: 'admin@test.local',
  passwordHash: await bcrypt.hash('Password123', 4),
  displayName: 'Admin',
  role: Role.ADMIN,
  status: UserStatus.ACTIVE,
  mustChangePassword: false,
  approvedById: null,
  approvedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

describe('ttlToMs', () => {
  it('parses the units we configure', () => {
    expect(ttlToMs('15m')).toBe(900_000);
    expect(ttlToMs('7d')).toBe(604_800_000);
    expect(() => ttlToMs('2w')).toThrow();
  });
});

describe('AuthService (sessions)', () => {
  let service: AuthService;
  let jwt: JwtService;
  /** in-memory session table so rotation/reuse behave like the real DB */
  let sessions: Map<string, { id: string; userId: string; refreshTokenHash: string; expiresAt: Date; revokedAt: Date | null }>;
  let userRow: Awaited<ReturnType<typeof baseUser>>;
  const prisma = {
    user: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), create: jest.fn(), update: jest.fn() },
    session: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    sessions = new Map();
    userRow = await baseUser();
    prisma.user.findUnique.mockImplementation(async () => userRow);
    prisma.session.create.mockImplementation(async ({ data }: { data: any }) => {
      const row = { id: SID, revokedAt: null, ...data };
      sessions.set(row.id, row);
      return row;
    });
    prisma.session.update.mockImplementation(async ({ where, data }: { where: { id: string }; data: any }) => {
      const row = { ...sessions.get(where.id)!, ...data };
      sessions.set(where.id, row);
      return row;
    });
    prisma.session.updateMany.mockImplementation(async ({ where, data }: { where: any; data: any }) => {
      for (const row of sessions.values()) {
        const excluded = where.NOT?.id && row.id === where.NOT.id;
        if ((!where.id || row.id === where.id) && (!where.userId || row.userId === where.userId) && !excluded && row.revokedAt === null) Object.assign(row, data);
      }
      return { count: 1 };
    });
    prisma.session.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      const row = sessions.get(where.id);
      return row ? { ...row, user: userRow } : null;
    });

    const mod = await Test.createTestingModule({
      providers: [
        AuthService,
        JwtService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (k: string) => ({ JWT_ACCESS_SECRET: SECRET_A, JWT_REFRESH_SECRET: SECRET_R })[k],
            get: (k: string) => ({ JWT_ACCESS_TTL: '15m', JWT_REFRESH_TTL: '7d' })[k],
          },
        },
      ],
    }).compile();
    service = mod.get(AuthService);
    jwt = mod.get(JwtService);
  });

  describe('register', () => {
    it('creates a PENDING ADMIN', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({});
      const res = await service.register({ email: 'new@test.local', password: 'Password123', displayName: 'New' });
      expect(res.status).toBe(UserStatus.PENDING);
      const data = prisma.user.create.mock.calls[0][0].data;
      expect(data.role).toBe(Role.ADMIN);
      expect(data.passwordHash).not.toBe('Password123');
    });

    it('rejects duplicate email', async () => {
      await expect(service.register({ email: 'admin@test.local', password: 'Password123', displayName: 'X' })).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    it('creates a session and returns tokens carrying its sid', async () => {
      const res = await service.login({ email: 'admin@test.local', password: 'Password123' }, { userAgent: 'jest', ip: '127.0.0.1' });
      expect(res.accessToken).toBeTruthy();
      expect(res.refreshToken).toBeTruthy();
      expect(res.user.sid).toBe(SID);
      const p = jwt.decode(res.accessToken) as any;
      expect(p.typ).toBe('access');
      expect(p.sid).toBe(SID);
      // session stores only the hash of the refresh token, never the token
      expect(sessions.get(SID)!.refreshTokenHash).toBe(hashToken(res.refreshToken));
      expect(prisma.session.create.mock.calls[0][0].data.userAgent).toBe('jest');
    });

    it('rejects wrong password with the same message as unknown email', async () => {
      await expect(service.login({ email: 'admin@test.local', password: 'nope' })).rejects.toThrow('Invalid email or password');
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login({ email: 'ghost@test.local', password: 'nope' })).rejects.toThrow('Invalid email or password');
    });

    it.each([UserStatus.PENDING, UserStatus.DISABLED])('rejects %s user', async (status: UserStatus) => {
      userRow = await baseUser({ status });
      await expect(service.login({ email: 'admin@test.local', password: 'Password123' })).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('rotates the token, rejects reuse of the old one, and revokes only that session', async () => {
      const first = await service.login({ email: 'admin@test.local', password: 'Password123' });
      const second = await service.refresh(first.refreshToken);
      expect(second.refreshToken).not.toBe(first.refreshToken);
      expect(sessions.get(SID)!.refreshTokenHash).toBe(hashToken(second.refreshToken));

      await expect(service.refresh(first.refreshToken)).rejects.toThrow('reuse');
      expect(sessions.get(SID)!.revokedAt).not.toBeNull();
      await expect(service.refresh(second.refreshToken)).rejects.toThrow('Refresh not allowed');
    });

    it('rejects an access token used as refresh', async () => {
      const { accessToken } = await service.login({ email: 'admin@test.local', password: 'Password123' });
      await expect(service.refresh(accessToken)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a refresh for a disabled user even with a valid token', async () => {
      const { refreshToken } = await service.login({ email: 'admin@test.local', password: 'Password123' });
      userRow = await baseUser({ status: UserStatus.DISABLED });
      await expect(service.refresh(refreshToken)).rejects.toThrow('Refresh not allowed');
    });
  });

  describe('changePassword', () => {
    it('keeps the current session, revokes the others, and clears mustChangePassword', async () => {
      userRow = await baseUser({ mustChangePassword: true });
      await service.login({ email: 'admin@test.local', password: 'Password123' });
      sessions.set('phone', { id: 'phone', userId: userRow.id, refreshTokenHash: 'x', expiresAt: new Date(Date.now() + 1000), revokedAt: null });
      prisma.user.findUniqueOrThrow.mockResolvedValue(userRow);
      prisma.user.update.mockImplementation(async ({ data }: { data: any }) => ({ ...userRow, ...data }));

      await service.changePassword(userRow.id, { currentPassword: 'Password123', newPassword: 'NewPassword456' }, SID);
      expect(prisma.user.update.mock.calls[0][0].data.mustChangePassword).toBe(false);
      expect(sessions.get(SID)!.revokedAt).toBeNull();
      expect(sessions.get('phone')!.revokedAt).not.toBeNull();
    });

    it('rejects a wrong current password', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue(userRow);
      await expect(service.changePassword(userRow.id, { currentPassword: 'nope', newPassword: 'NewPassword456' })).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('logout revokes the one session, logoutAll revokes every session of the user', async () => {
      await service.login({ email: 'admin@test.local', password: 'Password123' });
      await service.logout(SID);
      expect(sessions.get(SID)!.revokedAt).not.toBeNull();

      sessions.set('other', { id: 'other', userId: userRow.id, refreshTokenHash: 'x', expiresAt: new Date(Date.now() + 1000), revokedAt: null });
      await service.logoutAll(userRow.id);
      expect(sessions.get('other')!.revokedAt).not.toBeNull();
    });
  });
});
