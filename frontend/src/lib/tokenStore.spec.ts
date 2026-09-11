import { afterEach, describe, expect, it } from 'vitest';
import { adoptTokensFromOpener, exposeTokensToOpenedTabs, tokenStore } from './tokenStore';

describe('cross-tab token handoff', () => {
  afterEach(() => {
    tokenStore.clear();
    delete (window as any).opener;
    delete (window as any).__sbAuth;
  });

  it('exposes the current tokens for a tab opened from this one', () => {
    tokenStore.set('acc-1', 'ref-1');
    exposeTokensToOpenedTabs();
    expect(window.__sbAuth?.get()).toEqual({ access: 'acc-1', refresh: 'ref-1' });
  });

  it('adopts tokens from window.opener when present', () => {
    (window as any).opener = { __sbAuth: { get: () => ({ access: 'acc-2', refresh: 'ref-2' }) } };
    adoptTokensFromOpener();
    expect(tokenStore.get()).toEqual({ access: 'acc-2', refresh: 'ref-2' });
  });

  it('does nothing when there is no opener (a normal page load)', () => {
    adoptTokensFromOpener();
    expect(tokenStore.get()).toEqual({ access: null, refresh: null });
  });

  it('does nothing when the opener is not a ServiceBay tab', () => {
    (window as any).opener = {};
    adoptTokensFromOpener();
    expect(tokenStore.get()).toEqual({ access: null, refresh: null });
  });
});
