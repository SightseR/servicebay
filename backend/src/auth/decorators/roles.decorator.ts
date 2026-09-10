import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
/** MANAGER always passes; list the minimum role(s) needed. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
