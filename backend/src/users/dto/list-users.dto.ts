import { UserStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ListUsersDto {
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
