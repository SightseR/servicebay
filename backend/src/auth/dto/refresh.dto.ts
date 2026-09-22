import { IsOptional, IsString, MinLength } from 'class-validator';

/** Optional: browsers use the httpOnly cookie instead; only non-browser clients send this. */
export class RefreshDto {
  @IsOptional()
  @IsString()
  @MinLength(20)
  refreshToken?: string;
}
