/**
 * Tokens live in memory only (no localStorage — refresh token is high-value).
 * A page reload means a fresh login; acceptable for a single-garage internal tool
 * and avoids XSS-exfiltration risk. Revisit if "remember me" is ever requested.
 */
let access: string | null = null;
let refresh: string | null = null;

export const tokenStore = {
  get: () => ({ access, refresh }),
  set: (a: string | null, r: string | null) => { access = a; refresh = r; },
  clear: () => { access = null; refresh = null; },
};
