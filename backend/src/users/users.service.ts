import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

const publicSelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  status: true,
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

    return this.prisma.user.update({
      where: { id },
      data: {
        ...dto,
        // revoke sessions when disabling or changing role
        ...(dto.status === UserStatus.DISABLED || (dto.role && dto.role !== user.role) ? { refreshTokenHash: null } : {}),
      },
      select: publicSelect,
    });
  }
}
