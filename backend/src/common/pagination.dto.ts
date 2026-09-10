import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
}

export const paginate = <T>(items: T[], total: number, p: PaginationDto) => ({
  items,
  total,
  page: p.page,
  pageSize: p.pageSize,
  pages: Math.max(1, Math.ceil(total / p.pageSize)),
});
