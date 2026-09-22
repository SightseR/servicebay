import type { CookieOptions, Response } from 'express';

export const REFRESH_COOKIE = 'sb_refresh';

/**
 * D16/D19: httpOnly so JavaScript can never read it; Secure on HTTPS (production);
 * SameSite=Lax so cross-site requests don't carry it; path-scoped so it is only
 * sent to the auth endpoints, never to the rest of the API.
 */
export function refreshCookieOptions(expiresAt: Date, isProduction: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/api/v1/auth',
    expires: expiresAt,
  };
}

export function setRefreshCookie(res: Response, token: string, expiresAt: Date, isProduction: boolean) {
  res.cookie(REFRESH_COOKIE, token, refreshCookieOptions(expiresAt, isProduction));
}

export function clearRefreshCookie(res: Response, isProduction: boolean) {
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(new Date(0), isProduction), expires: undefined });
}
