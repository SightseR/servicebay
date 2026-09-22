import { Role, UserStatus } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  /** 'access' | 'refresh' — prevents a refresh token being used as an access token */
  typ: 'access' | 'refresh';
  /** unique per token so two tokens minted in the same second never collide */
  jti: string;
  /** session (device) this token belongs to — lets logout revoke exactly one device */
  sid: string;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  status: UserStatus;
  mustChangePassword: boolean;
  /** current session id, from the access token */
  sid?: string;
}

/** What the API returns to the browser. The refresh token travels only in the httpOnly cookie, never in this body. */
export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

/** Internal: both tokens, only ever handed to the controller so it can set the cookie. */
export interface IssuedTokens extends AuthResponse {
  refreshToken: string;
  refreshExpiresAt: Date;
}
