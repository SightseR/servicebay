import { API_BASE } from './env';
import { tokenStore } from './tokenStore';

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message?: string) {
    super(message ?? ApiError.extractMessage(body) ?? `Request failed (${status})`);
    this.status = status;
    this.body = body;
  }

  /** NestJS's ValidationPipe returns `message` as a string[] (one entry per failed rule) — join those into one readable line. A plain string passes through unchanged. */
  private static extractMessage(body: unknown): string | undefined {
    const raw = (body as { message?: unknown } | undefined)?.message;
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw) && raw.every((m) => typeof m === 'string')) return raw.join('; ');
    return undefined;
  }
}

export interface AuthUser { id: string; email: string; displayName: string; role: 'MANAGER' | 'ADMIN'; status: string; mustChangePassword: boolean; sid?: string }
export interface AuthResponse { accessToken: string; user: AuthUser }

/** Single-flight refresh: concurrent 401s share one refresh call instead of racing. */
let refreshing: Promise<AuthUser | null> | null = null;
let onSessionExpired: (() => void) | null = null;
export const setSessionExpiredHandler = (fn: (() => void) | null) => { onSessionExpired = fn; };

/** Asks the server for a new access token using the httpOnly refresh cookie. Returns the user on success, null otherwise. */
async function doRefresh(): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (!res.ok) { tokenStore.clear(); return null; }
    const data: AuthResponse = await res.json();
    tokenStore.set(data.accessToken);
    return data.user;
  } catch {
    return null;
  }
}

export async function refreshOnce(): Promise<AuthUser | null> {
  if (!refreshing) refreshing = doRefresh().finally(() => { refreshing = null; });
  return refreshing;
}

export interface RequestOptions { method?: string; body?: unknown; skipAuth?: boolean }

/** A FormData body is sent as multipart (the browser sets the boundary header itself); anything else is JSON. */
const isFormData = (b: unknown): b is FormData => typeof FormData !== 'undefined' && b instanceof FormData;

/** Core fetch wrapper: attaches the bearer token, retries once after a silent refresh on 401. */
export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const run = async (): Promise<Response> => {
    const access = tokenStore.get();
    return fetch(`${API_BASE}${path}`, {
      method: opts.method ?? 'GET',
      credentials: 'include',
      headers: {
        ...(opts.body !== undefined && !isFormData(opts.body) ? { 'Content-Type': 'application/json' } : {}),
        ...(access && !opts.skipAuth ? { Authorization: `Bearer ${access}` } : {}),
      },
      body: opts.body === undefined ? undefined : isFormData(opts.body) ? opts.body : JSON.stringify(opts.body),
    });
  };

  let res = await run();
  if (res.status === 401 && !opts.skipAuth) {
    const user = await refreshOnce();
    if (user) res = await run();
    else { tokenStore.clear(); onSessionExpired?.(); }
  }

  if (res.status === 204) return undefined as T;
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json().catch(() => undefined) : undefined;
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}
