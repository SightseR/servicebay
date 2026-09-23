import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import { MailService } from '../mail/mail.service';
import { passwordResetEmail } from '../mail/templates';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthUser, IssuedTokens, JwtPayload } from './types';

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_MINUTES = 30;

/**
 * Refresh tokens are hashed with SHA-256, not bcrypt: bcrypt silently truncates
 * input at 72 bytes and a JWT's first 72 bytes are identical for every token of
 * the same user, so bcrypt would "match" any of them. The token itself is
 * high-entropy, so a fast hash is appropriate.
 */
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const tokenMatches = (token: string, hash: string) => {
  const a = Buffer.from(hashToken(token), 'hex');
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
};

/** "7d" / "15m" / "30s" → milliseconds (only the units we configure). */
export function ttlToMs(ttl: string): number {
  const m = /^(\d+)([smhd])$/.exec(ttl.trim());
  if (!m) throw new Error(`Unsupported TTL format: ${ttl}`);
  const n = Number(m[1]);
  return { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2] as 's' | 'm' | 'h' | 'd']! * n;
}

export const toAuthUser = (u: Pick<User, 'id' | 'email' | 'displayName' | 'role' | 'status' | 'mustChangePassword'>, sid?: string): AuthUser => ({
  id: u.id,
  email: u.email,
  displayName: u.displayName,
  role: u.role,
  status: u.status,
  mustChangePassword: u.mustChangePassword,
  ...(sid ? { sid } : {}),
});

export interface ClientInfo { userAgent?: string; ip?: string }

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  /** New accounts are PENDING until a manager approves them (D2). */
  async register(dto: RegisterDto): Promise<{ status: UserStatus }> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('An account with this email already exists');
    await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
        displayName: dto.displayName,
        role: Role.ADMIN,
        status: UserStatus.PENDING,
      },
    });
    return { status: UserStatus.PENDING };
  }

  /** Creates a new per-device session and issues its first token pair. */
  async login(dto: LoginDto, client: ClientInfo = {}): Promise<IssuedTokens> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Same error for unknown email and wrong password — don't leak which.
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.status === UserStatus.PENDING) throw new UnauthorizedException('Account is awaiting manager approval');
    if (user.status === UserStatus.DISABLED) throw new UnauthorizedException('Account is disabled');

    const expiresAt = new Date(Date.now() + ttlToMs(this.config.get('JWT_REFRESH_TTL') ?? '7d'));
    const session = await this.prisma.session.create({
      data: { userId: user.id, refreshTokenHash: 'pending', userAgent: client.userAgent ?? null, ip: client.ip ?? null, expiresAt },
    });
    return this.issueTokens(user, session.id, expiresAt);
  }

  /**
   * Rotates the refresh token for one session. Presenting a refresh token that no
   * longer matches the session's stored hash means it was already rotated (or stolen
   * and used): that session is revoked. Other devices are unaffected.
   */
  async refresh(refreshToken: string): Promise<IssuedTokens> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, { secret: this.config.getOrThrow('JWT_REFRESH_SECRET') });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (payload.typ !== 'refresh') throw new UnauthorizedException('Wrong token type');

    const session = await this.prisma.session.findUnique({ where: { id: payload.sid }, include: { user: true } });
    if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Refresh not allowed');
    }
    if (!tokenMatches(refreshToken, session.refreshTokenHash)) {
      await this.prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    return this.issueTokens(session.user, session.id, session.expiresAt);
  }

  /** Revokes just this device's session. */
  async logout(sid: string | undefined): Promise<void> {
    if (!sid) return;
    await this.prisma.session.updateMany({ where: { id: sid, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  /** Revokes every session of a user ("log out everywhere", and used when an account is disabled). */
  async logoutAll(userId: string): Promise<void> {
    await this.prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  /** Changes the caller's own password. Every OTHER device is signed out; the current session stays. */
  async changePassword(userId: string, dto: ChangePasswordDto, keepSid?: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS), mustChangePassword: false },
    });
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null, ...(keepSid ? { NOT: { id: keepSid } } : {}) },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Email reset, step 1. Always resolves the same way whether or not the address exists
   * (no account enumeration). Only ACTIVE users get an email; any earlier unused tokens
   * are invalidated so exactly one link works at a time.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.status !== UserStatus.ACTIVE) return;

    const token = randomBytes(32).toString('hex'); // 64 hex chars, only its hash is stored
    const expiresAt = new Date(Date.now() + RESET_TOKEN_MINUTES * 60_000);
    await this.prisma.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } });
    await this.prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt } });

    const link = `${this.config.get('APP_URL') ?? 'http://localhost:8080'}/reset-password?token=${token}`;
    await this.mail.send({ to: user.email, ...passwordResetEmail(link, RESET_TOKEN_MINUTES) });
  }

  /** Email reset, step 2. Consumes the token, sets the password, signs every device out. */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const row = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
    if (!row || row.usedAt || row.expiresAt <= new Date() || row.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('This reset link is invalid or has expired');
    }
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
      this.prisma.user.update({ where: { id: row.userId }, data: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS), mustChangePassword: false } }),
      this.prisma.session.updateMany({ where: { userId: row.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
  }

  async updateProfile(userId: string, displayName: string): Promise<AuthUser> {
    const user = await this.prisma.user.update({ where: { id: userId }, data: { displayName } });
    return toAuthUser(user);
  }

  private async issueTokens(user: User, sid: string, refreshExpiresAt: Date): Promise<IssuedTokens> {
    const base = { sub: user.id, email: user.email, role: user.role, sid };
    const accessToken = await this.jwt.signAsync({ ...base, typ: 'access', jti: randomUUID() } satisfies JwtPayload, {
      secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_TTL') ?? '15m',
    });
    const refreshToken = await this.jwt.signAsync({ ...base, typ: 'refresh', jti: randomUUID() } satisfies JwtPayload, {
      secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_TTL') ?? '7d',
    });
    await this.prisma.session.update({
      where: { id: sid },
      data: { refreshTokenHash: hashToken(refreshToken), lastUsedAt: new Date() },
    });
    return { accessToken, refreshToken, refreshExpiresAt, user: toAuthUser(user, sid) };
  }
}
