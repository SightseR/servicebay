import { plainToInstance, Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MinLength, validateSync } from 'class-validator';

enum NodeEnv {
  development = 'development',
  production = 'production',
  test = 'test',
}

const toInt = ({ value }: { value: unknown }) => {
  const n = parseInt(String(value).trim(), 10);
  return Number.isNaN(n) ? value : n;
};
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

class EnvVars {
  @Transform(trim) @IsEnum(NodeEnv) NODE_ENV: NodeEnv = NodeEnv.development;
  @Transform(toInt) @IsInt() PORT = 3000;
  @Transform(trim) @IsString() DATABASE_URL!: string;
  @Transform(trim) @IsString() @MinLength(32) JWT_ACCESS_SECRET!: string;
  @Transform(trim) @IsString() @MinLength(32) JWT_REFRESH_SECRET!: string;
  @Transform(trim) @IsString() JWT_ACCESS_TTL = '15m';
  @Transform(trim) @IsString() JWT_REFRESH_TTL = '7d';
  @Transform(trim) @IsString() CORS_ORIGIN = 'http://localhost:8080';
  /** where uploaded files (company logo) are written; a docker volume in both dev and prod */
  @Transform(trim) @IsString() UPLOADS_DIR = 'uploads';
  /** public base URL of the app, used to build links in emails */
  @Transform(trim) @IsString() APP_URL = 'http://localhost:8080';
  /** Resend API key. Empty = emails are logged to the console instead of sent (local dev). */
  @IsOptional() @Transform(trim) @IsString() RESEND_API_KEY?: string;
  @Transform(trim) @IsString() MAIL_FROM = 'ServiceBay <onboarding@resend.dev>';
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvVars, config);
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length) {
    throw new Error(`Invalid environment:\n${errors.map((e) => Object.values(e.constraints ?? {}).join(', ')).join('\n')}`);
  }
  return validated;
}
