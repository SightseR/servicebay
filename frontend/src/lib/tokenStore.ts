/**
 * Tokens live in memory only (no localStorage — refresh token is high-value).
 * A page reload means a fresh login; acceptable for a single-garage internal tool
 * and avoids XSS-exfiltration risk. Revisit if "remember me" is ever requested.
 *
 * Cross-tab handoff: a tab opened via window.open()/target="_blank" from within the
 * app (e.g. the print report) can read the opener tab's current access token through
 * window.opener — same-origin only, so this is invisible to any other site. This is a
 * one-shot copy for that tab's initial boot, not shared state: each tab still refreshes
 * independently afterwards. The print link must NOT use rel="noopener" or this breaks.
 */
let access: string | null = null;
let refresh: string | null = null;

export const tokenStore = {
  get: () => ({ access, refresh }),
  set: (a: string | null, r: string | null) => { access = a; refresh = r; },
  clear: () => { access = null; refresh = null; },
};

declare global {
  interface Window { __sbAuth?: { get: () => { access: string | null; refresh: string | null } } }
}

/** Call once at boot so other same-origin tabs opened from this one can adopt our tokens. */
export function exposeTokensToOpenedTabs() {
  window.__sbAuth = { get: tokenStore.get };
}

/** Call once at boot, before the first render: pulls tokens from window.opener if this tab was opened by the app itself. */
export function adoptTokensFromOpener() {
  try {
    const openerAuth = window.opener?.__sbAuth;
    if (!openerAuth) return;
    const { access: a, refresh: r } = openerAuth.get();
    if (a) tokenStore.set(a, r);
  } catch {
    // Cross-origin opener (shouldn't happen for same-app tabs) — ignore.
  }
}
