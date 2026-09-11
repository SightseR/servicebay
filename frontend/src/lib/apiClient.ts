import { API_BASE } from './env';
import { tokenStore } from './tokenStore';

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message?: string) {
    super(message ?? (typeof (body as any)?.message === 'string' ? (body as any).message : `Request failed (${status})`));
    this.status = status;
    this.body = body;
  }
}

export interface AuthUser { id: string; email: string; displayName: string; role: 'MANAGER' | 'ADMIN'; status: string }
interface TokenPair { accessToken: string; refreshToken: string; user: AuthUser }

/** Single-flight refresh: concurrent 401s share one refresh call instead of racing. */
let refreshing: Promise<boolean> | null = null;
let onSessionExpired: (() => void) | null = null;
export const setSessionExpiredHandler = (fn: (() => void) | null) => { onSessionExpired = fn; };

async function doRefresh(): Promise<boolean> {
  const { refresh } = tokenStore.get();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) { tokenStore.clear(); return false; }
    const data: TokenPair = await res.json();
    tokenStore.set(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function refreshOnce(): Promise<boolean> {
  if (!refreshing) refreshing = doRefresh().finally(() => { refreshing = null; });
  return refreshing;
}

export interface RequestOptions { method?: string; body?: unknown; skipAuth?: boolean }

/** Core fetch wrapper: attaches the bearer token, retries once after a silent refresh on 401. */
export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const run = async (): Promise<Response> => {
    const { access } = tokenStore.get();
    return fetch(`${API_BASE}${path}`, {
      method: opts.method ?? 'GET',
      headers: {
        ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(access && !opts.skipAuth ? { Authorization: `Bearer ${access}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  };

  let res = await run();
  if (res.status === 401 && !opts.skipAuth) {
    const ok = await refreshOnce();
    if (ok) res = await run();
    else { tokenStore.clear(); onSessionExpired?.(); }
  }

  if (res.status === 204) return undefined as T;
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json().catch(() => undefined) : undefined;
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}
