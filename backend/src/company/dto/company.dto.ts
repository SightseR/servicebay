import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

const trimOrNull = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value ?? null);

/** D4 — grouped in the UI as Identity / Contact / Legal, flat here. */
export class UpdateCompanyDto {
  @IsOptional() @Transform(trimOrNull) @IsString() @MaxLength(120) companyName?: string | null;
  @IsOptional() @Transform(trimOrNull) @IsString() @MaxLength(160) tagline?: string | null;
  @IsOptional() @Transform(trimOrNull) @IsString() @MaxLength(120) addressLine1?: string | null;
  @IsOptional() @Transform(trimOrNull) @IsString() @MaxLength(120) addressLine2?: string | null;
  @IsOptional() @Transform(trimOrNull) @IsString() @MaxLength(20) postalCode?: string | null;
  @IsOptional() @Transform(trimOrNull) @IsString() @MaxLength(80) city?: string | null;
  @IsOptional() @Transform(trimOrNull) @IsString() @MaxLength(80) country?: string | null;
  @IsOptional() @Transform(trimOrNull) @IsString() @MaxLength(40) phone?: string | null;
  @IsOptional() @Transform(trimOrNull) @IsEmail() email?: string | null;
  @IsOptional() @Transform(trimOrNull) @IsString() @MaxLength(120) website?: string | null;
  @IsOptional() @Transform(trimOrNull) @IsString() @MaxLength(40) businessId?: string | null;
  @IsOptional() @Transform(trimOrNull) @IsString() @MaxLength(40) vatId?: string | null;
}
