import { DriveMode, Gearbox, MotivePower } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  Allow, ArrayMaxSize, IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { PaginationDto } from '../../common/pagination.dto';
import { CreateVehicleDto } from '../../vehicles/dto/vehicle.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class ValueInputDto {
  @IsUUID('4') fieldId!: string;
  /** shape depends on field type — validated in record-values.ts (Allow: keep it through the whitelist pipe) */
  @Allow() value!: unknown;
}

export class CreateRecordDto {
  /** either an existing vehicle… */
  @IsOptional() @IsUUID('4') vehicleId?: string;
  /** …or a new one (409 if the registration already exists) */
  @IsOptional() @ValidateNested() @Type(() => CreateVehicleDto) vehicle?: CreateVehicleDto;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) kilometers?: number | null;
  @IsOptional() @IsEnum(Gearbox) gearbox?: Gearbox | null;
  @IsOptional() @IsEnum(MotivePower) motivePower?: MotivePower | null;
  @IsOptional() @IsEnum(DriveMode) driveMode?: DriveMode | null;
  @IsOptional() @IsDateString() servicedAt?: string;

  @IsArray() @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => ValueInputDto) values!: ValueInputDto[];
}

export class UpdateRecordDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) kilometers?: number | null;
  @IsOptional() @IsEnum(Gearbox) gearbox?: Gearbox | null;
  @IsOptional() @IsEnum(MotivePower) motivePower?: MotivePower | null;
  @IsOptional() @IsEnum(DriveMode) driveMode?: DriveMode | null;
  @IsOptional() @IsDateString() servicedAt?: string;
  /** when present, replaces ALL values of the record */
  @IsOptional() @IsArray() @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => ValueInputDto) values?: ValueInputDto[];
}

export class ListRecordsDto extends PaginationDto {
  /** export only: 'en' | 'it' */
  @IsOptional() @IsString() lang?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(60) q?: string;
  @IsOptional() @IsUUID('4') vehicleId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}
