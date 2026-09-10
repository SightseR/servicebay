import { DriveMode, Gearbox, MotivePower } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsEmail, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PaginationDto } from '../../common/pagination.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const trimOrNull = ({ value }: { value: unknown }) =>
  value === null || value === undefined ? value : typeof value === 'string' ? value.trim() || null : value;

export class CreateVehicleDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(20) regNumber!: string;
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(60) brand!: string;
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(60) model!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1900) @Max(2100) year?: number | null;
  @IsOptional() @IsEnum(Gearbox) gearbox?: Gearbox | null;
  @IsOptional() @IsEnum(MotivePower) motivePower?: MotivePower | null;
  @IsOptional() @IsEnum(DriveMode) driveMode?: DriveMode | null;
  @IsOptional() @Transform(trimOrNull) @IsString() @MaxLength(120) ownerName?: string | null;
  @IsOptional() @Transform(trimOrNull) @IsString() @MaxLength(40) ownerPhone?: string | null;
  @IsOptional() @Transform(trimOrNull) @IsEmail() ownerEmail?: string | null;
}

export class UpdateVehicleDto {
  @IsOptional() @Transform(trim) @IsString() @MinLength(2) @MaxLength(20) regNumber?: string;
  @IsOptional() @Transform(trim) @IsString() @MinLength(1) @MaxLength(60) brand?: string;
  @IsOptional() @Transform(trim) @IsString() @MinLength(1) @MaxLength(60) model?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1900) @Max(2100) year?: number | null;
  @IsOptional() @IsEnum(Gearbox) gearbox?: Gearbox | null;
  @IsOptional() @IsEnum(MotivePower) motivePower?: MotivePower | null;
  @IsOptional() @IsEnum(DriveMode) driveMode?: DriveMode | null;
  @IsOptional() @Transform(trimOrNull) @IsString() @MaxLength(120) ownerName?: string | null;
  @IsOptional() @Transform(trimOrNull) @IsString() @MaxLength(40) ownerPhone?: string | null;
  @IsOptional() @Transform(trimOrNull) @IsEmail() ownerEmail?: string | null;
}

export class ListVehiclesDto extends PaginationDto {
  /** matches reg number (normalised), owner name, owner phone, brand, model */
  @IsOptional() @Transform(trim) @IsString() @MaxLength(60) q?: string;
}
