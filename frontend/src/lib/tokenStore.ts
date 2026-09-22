/**
 * Only the short-lived access token lives here, in memory. The refresh token is an
 * httpOnly cookie (D16) that JavaScript can never read — the browser attaches it to
 * /auth/refresh automatically. A page reload therefore just re-runs the silent refresh
 * on boot (D17) instead of forcing a login, and a new tab (e.g. the print report) gets
 * its own access token the same way — no cross-tab handoff needed any more.
 */
let access: string | null = null;

export const tokenStore = {
  get: () => access,
  set: (a: string | null) => { access = a; },
  clear: () => { access = null; },
};
