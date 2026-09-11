import { FieldType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsObject, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const trimOrNull = ({ value }: { value: unknown }) =>
  value === null || value === undefined ? value : typeof value === 'string' ? value.trim() || null : value;

export class OptionInputDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(120) labelEn!: string;
  @IsOptional() @Transform(trimOrNull) @IsString() @MaxLength(120) labelIt?: string | null;
}

export class CreateFieldDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(120) labelEn!: string;
  @IsOptional() @Transform(trimOrNull) @IsString() @MaxLength(120) labelIt?: string | null;
  @IsEnum(FieldType) type!: FieldType;
  @IsOptional() @IsBoolean() required?: boolean;
  @IsOptional() @IsBoolean() showInReport?: boolean;
  @IsOptional() @IsObject() config?: Record<string, unknown>;
  /** initial options for choice types */
  @IsOptional() @IsArray() @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => OptionInputDto) options?: OptionInputDto[];
}

export class UpdateFieldDto {
  @IsOptional() @Transform(trim) @IsString() @MinLength(1) @MaxLength(120) labelEn?: string;
  @IsOptional() @Transform(trimOrNull) @IsString() @MaxLength(120) labelIt?: string | null;
  /** allowed only while the field has no stored values */
  @IsOptional() @IsEnum(FieldType) type?: FieldType;
  @IsOptional() @IsBoolean() required?: boolean;
  @IsOptional() @IsBoolean() showInReport?: boolean;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsObject() config?: Record<string, unknown>;
}

export class CreateOptionDto extends OptionInputDto {}

export class UpdateOptionDto {
  @IsOptional() @Transform(trim) @IsString() @MinLength(1) @MaxLength(120) labelEn?: string;
  @IsOptional() @Transform(trimOrNull) @IsString() @MaxLength(120) labelIt?: string | null;
  @IsOptional() @IsBoolean() active?: boolean;
}
