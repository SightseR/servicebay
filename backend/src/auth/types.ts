import { Role, UserStatus } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  /** 'access' | 'refresh' — prevents a refresh token being used as an access token */
  typ: 'access' | 'refresh';
  /** unique per token so two tokens minted in the same second never collide */
  jti: string;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  status: UserStatus;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
