import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, ApiError, setSessionExpiredHandler } from './apiClient';
import { tokenStore } from './tokenStore';

const jsonRes = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('apiFetch', () => {
  beforeEach(() => { tokenStore.set('access-1', 'refresh-1'); setSessionExpiredHandler(null); });
  afterEach(() => { vi.restoreAllMocks(); tokenStore.clear(); });

  it('attaches the bearer token', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(jsonRes(200, { ok: true }));
    await apiFetch('/health');
    const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer access-1');
  });

  it('refreshes once on 401 and retries the original request', async () => {
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonRes(401, { message: 'expired' }))
      .mockResolvedValueOnce(jsonRes(200, { accessToken: 'access-2', refreshToken: 'refresh-2', user: {} }))
      .mockResolvedValueOnce(jsonRes(200, { ok: true }));

    const result = await apiFetch<{ ok: boolean }>('/records');
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(tokenStore.get().access).toBe('access-2');
    const retryHeaders = fetchMock.mock.calls[2][1]?.headers as Record<string, string>;
    expect(retryHeaders.Authorization).toBe('Bearer access-2');
  });

  it('single-flights concurrent refreshes: two 401s trigger only one refresh call', async () => {
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonRes(401, {}))
      .mockResolvedValueOnce(jsonRes(401, {}))
      .mockResolvedValueOnce(jsonRes(200, { accessToken: 'access-2', refreshToken: 'refresh-2', user: {} }))
      .mockResolvedValueOnce(jsonRes(200, { a: 1 }))
      .mockResolvedValueOnce(jsonRes(200, { b: 2 }));

    const [a, b] = await Promise.all([apiFetch('/a'), apiFetch('/b')]);
    expect(a).toEqual({ a: 1 });
    expect(b).toEqual({ b: 2 });
    const refreshCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes('/auth/refresh'));
    expect(refreshCalls).toHaveLength(1);
  });

  it('clears tokens and fires the session-expired handler when refresh fails', async () => {
    const onExpired = vi.fn();
    setSessionExpiredHandler(onExpired);
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(jsonRes(401, {})).mockResolvedValueOnce(jsonRes(401, {}));
    await expect(apiFetch('/records')).rejects.toBeInstanceOf(ApiError);
    expect(tokenStore.get().access).toBeNull();
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it('does not attempt refresh for skipAuth requests (login/register)', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValueOnce(jsonRes(401, { message: 'bad creds' }));
    await expect(apiFetch('/auth/login', { method: 'POST', skipAuth: true, body: {} })).rejects.toThrow('bad creds');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('treats 204 as no content', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(null, { status: 204 }));
    expect(await apiFetch('/auth/logout', { method: 'POST' })).toBeUndefined();
  });
});
