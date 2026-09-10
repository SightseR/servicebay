import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

const SECRET_A = 'a'.repeat(40);
const SECRET_R = 'r'.repeat(40);

const baseUser = async (over: Partial<Record<string, unknown>> = {}) => ({
  id: '11111111-1111-4111-8111-111111111111',
  email: 'admin@test.local',
  passwordHash: await bcrypt.hash('Password123', 4),
  displayName: 'Admin',
  role: Role.ADMIN,
  status: UserStatus.ACTIVE,
  refreshTokenHash: null as string | null,
  approvedById: null,
  approvedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

describe('AuthService', () => {
  let service: AuthService;
  let jwt: JwtService;
  const prisma = {
    user: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), create: jest.fn(), update: jest.fn() },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
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
    prisma.user.update.mockImplementation(async ({ data }: { data: unknown }) => data);
  });

  describe('register', () => {
    it('creates a PENDING ADMIN', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({});
      const res = await service.register({ email: 'new@test.local', password: 'Password123', displayName: 'New' });
      expect(res.status).toBe(UserStatus.PENDING);
      const data = prisma.user.create.mock.calls[0][0].data;
      expect(data.role).toBe(Role.ADMIN);
      expect(data.status).toBe(UserStatus.PENDING);
      expect(data.passwordHash).not.toBe('Password123');
    });

    it('rejects duplicate email', async () => {
      prisma.user.findUnique.mockResolvedValue(await baseUser());
      await expect(
        service.register({ email: 'admin@test.local', password: 'Password123', displayName: 'X' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    it('returns tokens and user for ACTIVE user', async () => {
      prisma.user.findUnique.mockResolvedValue(await baseUser());
      const res = await service.login({ email: 'admin@test.local', password: 'Password123' });
      expect(res.accessToken).toBeTruthy();
      expect(res.refreshToken).toBeTruthy();
      expect(res.user.email).toBe('admin@test.local');
      const p = jwt.decode(res.accessToken) as any;
      expect(p.typ).toBe('access');
      expect(p.role).toBe(Role.ADMIN);
      expect(prisma.user.update).toHaveBeenCalled(); // refresh hash stored
    });

    it('rejects wrong password with the same message as unknown email', async () => {
      prisma.user.findUnique.mockResolvedValue(await baseUser());
      const a = service.login({ email: 'admin@test.local', password: 'nope' });
      await expect(a).rejects.toBeInstanceOf(UnauthorizedException);
      prisma.user.findUnique.mockResolvedValue(null);
      const b = service.login({ email: 'ghost@test.local', password: 'nope' });
      await expect(b).rejects.toThrow('Invalid email or password');
    });

    it.each([UserStatus.PENDING, UserStatus.DISABLED])('rejects %s user', async (status: UserStatus) => {
      prisma.user.findUnique.mockResolvedValue(await baseUser({ status }));
      await expect(service.login({ email: 'admin@test.local', password: 'Password123' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('refresh', () => {
    it('rotates the token and rejects reuse of the old one', async () => {
      const user = await baseUser();
      prisma.user.findUnique.mockResolvedValue(user);
      const first = await service.login({ email: user.email, password: 'Password123' });
      user.refreshTokenHash = prisma.user.update.mock.calls.at(-1)![0].data.refreshTokenHash;

      const second = await service.refresh(first.refreshToken);
      expect(second.refreshToken).not.toBe(first.refreshToken);
      user.refreshTokenHash = prisma.user.update.mock.calls.at(-1)![0].data.refreshTokenHash;

      await expect(service.refresh(first.refreshToken)).rejects.toThrow('reuse');
      // reuse revokes the session entirely
      expect(prisma.user.update.mock.calls.at(-1)![0].data.refreshTokenHash).toBeNull();
    });

    it('rejects an access token used as refresh', async () => {
      prisma.user.findUnique.mockResolvedValue(await baseUser());
      const { accessToken } = await service.login({ email: 'admin@test.local', password: 'Password123' });
      await expect(service.refresh(accessToken)).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
