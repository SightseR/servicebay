import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, ApiError, refreshOnce, setSessionExpiredHandler } from './apiClient';
import { tokenStore } from './tokenStore';

const jsonRes = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const authRes = (access: string) => jsonRes(200, { accessToken: access, user: { id: 'u1', email: 'a@b', displayName: 'A', role: 'ADMIN', status: 'ACTIVE', sid: 's1' } });

describe('apiFetch', () => {
  beforeEach(() => { tokenStore.set('access-1'); setSessionExpiredHandler(null); });
  afterEach(() => { vi.restoreAllMocks(); tokenStore.clear(); });

  it('attaches the bearer token and sends cookies', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(jsonRes(200, { ok: true }));
    await apiFetch('/health');
    const init = fetchMock.mock.calls[0][1]!;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer access-1');
    expect(init.credentials).toBe('include');
  });

  it('refreshes via the cookie (no body) on 401 and retries the original request', async () => {
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonRes(401, { message: 'expired' }))
      .mockResolvedValueOnce(authRes('access-2'))
      .mockResolvedValueOnce(jsonRes(200, { ok: true }));

    const result = await apiFetch<{ ok: boolean }>('/records');
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const refreshCall = fetchMock.mock.calls[1];
    expect(String(refreshCall[0])).toContain('/auth/refresh');
    expect(refreshCall[1]!.body).toBeUndefined(); // cookie carries the refresh token
    expect(refreshCall[1]!.credentials).toBe('include');
    expect(tokenStore.get()).toBe('access-2');
    expect((fetchMock.mock.calls[2][1]!.headers as Record<string, string>).Authorization).toBe('Bearer access-2');
  });

  it('single-flights concurrent refreshes: two 401s trigger only one refresh call', async () => {
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonRes(401, {}))
      .mockResolvedValueOnce(jsonRes(401, {}))
      .mockResolvedValueOnce(authRes('access-2'))
      .mockResolvedValueOnce(jsonRes(200, { a: 1 }))
      .mockResolvedValueOnce(jsonRes(200, { b: 2 }));

    const [a, b] = await Promise.all([apiFetch('/a'), apiFetch('/b')]);
    expect(a).toEqual({ a: 1 });
    expect(b).toEqual({ b: 2 });
    expect(fetchMock.mock.calls.filter((c) => String(c[0]).includes('/auth/refresh'))).toHaveLength(1);
  });

  it('clears the access token and fires the session-expired handler when refresh fails', async () => {
    const onExpired = vi.fn();
    setSessionExpiredHandler(onExpired);
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(jsonRes(401, {})).mockResolvedValueOnce(jsonRes(401, {}));
    await expect(apiFetch('/records')).rejects.toBeInstanceOf(ApiError);
    expect(tokenStore.get()).toBeNull();
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

describe('refreshOnce (session restore on boot)', () => {
  afterEach(() => { vi.restoreAllMocks(); tokenStore.clear(); });

  it('returns the user and stores the access token when the cookie is valid', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(authRes('access-boot'));
    const user = await refreshOnce();
    expect(user?.email).toBe('a@b');
    expect(tokenStore.get()).toBe('access-boot');
  });

  it('returns null with no token when there is no valid cookie', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(jsonRes(401, {}));
    expect(await refreshOnce()).toBeNull();
    expect(tokenStore.get()).toBeNull();
  });
});

describe('ApiError message extraction', () => {
  afterEach(() => vi.restoreAllMocks());

  it('uses a plain string message as-is', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(jsonRes(400, { message: 'Invalid values' }));
    await expect(apiFetch('/x', { skipAuth: true })).rejects.toThrow('Invalid values');
  });

  it('joins a NestJS-style validation message array into one readable string', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(jsonRes(400, { message: ['email must be an email', 'website must be shorter than or equal to 120 characters'] }));
    await expect(apiFetch('/x', { skipAuth: true })).rejects.toThrow('email must be an email; website must be shorter than or equal to 120 characters');
  });

  it('falls back to a generic message when the body has no usable message', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(jsonRes(500, {}));
    await expect(apiFetch('/x', { skipAuth: true })).rejects.toThrow('Request failed (500)');
  });
});
