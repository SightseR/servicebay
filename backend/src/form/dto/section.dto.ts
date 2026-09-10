import { Transform } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateSectionDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(80) title!: string;
}

export class UpdateSectionDto {
  @IsOptional() @Transform(trim) @IsString() @MinLength(1) @MaxLength(80) title?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class ReorderDto {
  @IsArray() @ArrayMinSize(1) @IsUUID('4', { each: true }) ids!: string[];
}
