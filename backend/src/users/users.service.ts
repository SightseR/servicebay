import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

const publicSelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  status: true,
  mustChangePassword: true,
  approvedAt: true,
  createdAt: true,
  approvedBy: { select: { id: true, displayName: true } },
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list(status?: UserStatus) {
    return this.prisma.user.findMany({
      where: status ? { status } : undefined,
      select: publicSelect,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async get(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: publicSelect });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async approve(id: string, managerId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.status !== UserStatus.PENDING) throw new BadRequestException('User is not pending approval');
    return this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.ACTIVE, approvedById: managerId, approvedAt: new Date() },
      select: publicSelect,
    });
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (id === actorId) {
      if (dto.role && dto.role !== user.role) throw new BadRequestException('You cannot change your own role');
      if (dto.status === UserStatus.DISABLED) throw new BadRequestException('You cannot disable your own account');
    }
    // Never leave the system without an active manager.
    const demotingOrDisablingManager =
      user.role === Role.MANAGER && ((dto.role && dto.role !== Role.MANAGER) || dto.status === UserStatus.DISABLED);
    if (demotingOrDisablingManager) {
      const activeManagers = await this.prisma.user.count({
        where: { role: Role.MANAGER, status: UserStatus.ACTIVE, NOT: { id } },
      });
      if (activeManagers === 0) throw new BadRequestException('At least one active manager is required');
    }
    if (dto.status && user.status === UserStatus.PENDING) {
      throw new BadRequestException('Approve the user first');
    }

    const updated = await this.prisma.user.update({ where: { id }, data: dto, select: publicSelect });
    // Disabling, or changing role, must take effect on every device immediately (D2): revoke all sessions.
    if (dto.status === UserStatus.DISABLED || (dto.role && dto.role !== user.role)) {
      await this.prisma.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    return updated;
  }

  /**
   * Manager resets another user's password: a one-time temporary password is generated,
   * returned ONCE, and never stored in clear. Every session of that user is revoked and
   * they must choose a new password at next login. A manager cannot reset their own this way.
   */
  async resetPassword(id: string, actorId: string): Promise<{ temporaryPassword: string }> {
    if (id === actorId) throw new BadRequestException('Use your profile to change your own password');
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.status === UserStatus.PENDING) throw new BadRequestException('Approve the user first');

    const temporaryPassword = generateTemporaryPassword();
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(temporaryPassword, 12), mustChangePassword: true },
    });
    await this.prisma.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    return { temporaryPassword };
  }
}

/** 12 chars, unambiguous alphabet (no 0/O, 1/l/I), guaranteed a letter and a digit so it passes the change-password rules. */
export function generateTemporaryPassword(): string {
  const letters = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const all = letters + digits;
  const pick = (set: string) => set[randomInt(set.length)];
  const chars = [pick(letters), pick(digits), ...Array.from({ length: 10 }, () => pick(all))];
  for (let i = chars.length - 1; i > 0; i--) { const j = randomInt(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]]; }
  return chars.join('');
}
