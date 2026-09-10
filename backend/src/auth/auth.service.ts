import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthUser, JwtPayload, TokenPair } from './types';

const BCRYPT_ROUNDS = 12;

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

export const toAuthUser = (u: Pick<User, 'id' | 'email' | 'displayName' | 'role' | 'status'>): AuthUser => ({
  id: u.id,
  email: u.email,
  displayName: u.displayName,
  role: u.role,
  status: u.status,
});

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
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

  async login(dto: LoginDto): Promise<TokenPair & { user: AuthUser }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // Same error for unknown email and wrong password — don't leak which.
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.status === UserStatus.PENDING) throw new UnauthorizedException('Account is awaiting manager approval');
    if (user.status === UserStatus.DISABLED) throw new UnauthorizedException('Account is disabled');

    const tokens = await this.issueTokens(user);
    return { ...tokens, user: toAuthUser(user) };
  }

  /** Rotates the refresh token: the old one is invalidated on use. */
  async refresh(refreshToken: string): Promise<TokenPair & { user: AuthUser }> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (payload.typ !== 'refresh') throw new UnauthorizedException('Wrong token type');

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== UserStatus.ACTIVE || !user.refreshTokenHash) {
      throw new UnauthorizedException('Refresh not allowed');
    }
    if (!tokenMatches(refreshToken, user.refreshTokenHash)) {
      // Token was already rotated or revoked — treat as reuse, revoke everything.
      await this.prisma.user.update({ where: { id: user.id }, data: { refreshTokenHash: null } });
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    const tokens = await this.issueTokens(user);
    return { ...tokens, user: toAuthUser(user) };
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { refreshTokenHash: null } });
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS), refreshTokenHash: null },
    });
  }

  private async issueTokens(user: User): Promise<TokenPair> {
    const base = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwt.signAsync({ ...base, typ: 'access', jti: randomUUID() } satisfies JwtPayload, {
      secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_TTL') ?? '15m',
    });
    const refreshToken = await this.jwt.signAsync({ ...base, typ: 'refresh', jti: randomUUID() } satisfies JwtPayload, {
      secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_TTL') ?? '7d',
    });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: hashToken(refreshToken) },
    });
    return { accessToken, refreshToken };
  }
}
