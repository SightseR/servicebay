import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { apiFetch, ApiError, refreshOnce } from '../../lib/apiClient';
import type { AuthResponse, AuthUser } from '../../lib/apiClient';
import { tokenStore } from '../../lib/tokenStore';

interface AuthState {
  user: AuthUser | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  error: string | null;
}
const initialState: AuthState = { user: null, status: 'idle', error: null };

export const login = createAsyncThunk<AuthUser, { email: string; password: string }, { rejectValue: string }>(
  'auth/login',
  async (creds, { rejectWithValue }) => {
    try {
      const res = await apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: creds, skipAuth: true });
      tokenStore.set(res.accessToken); // refresh token arrived as an httpOnly cookie, not in the body
      return res.user;
    } catch (e) {
      return rejectWithValue(e instanceof ApiError ? e.message : 'Login failed');
    }
  },
);

export const register = createAsyncThunk<
  { status: string },
  { email: string; password: string; displayName: string },
  { rejectValue: string }
>('auth/register', async (body, { rejectWithValue }) => {
  try {
    return await apiFetch<{ status: string }>('/auth/register', { method: 'POST', body, skipAuth: true });
  } catch (e) {
    return rejectWithValue(e instanceof ApiError ? e.message : 'Registration failed');
  }
});

/**
 * D17 — on app boot: if the browser still holds a valid refresh cookie, this silently
 * mints a fresh access token and signs the user in without showing the login page.
 */
export const restoreSession = createAsyncThunk<AuthUser, void, { rejectValue: void }>('auth/restore', async (_, { rejectWithValue }) => {
  const user = await refreshOnce();
  return user ?? rejectWithValue();
});

export const logout = createAsyncThunk('auth/logout', async () => {
  try { await apiFetch('/auth/logout', { method: 'POST' }); } catch { /* best effort — cookie is cleared server-side */ }
  tokenStore.clear();
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionExpired(state) { state.user = null; state.status = 'unauthenticated'; },
  },
  extraReducers: (b) => {
    b.addCase(login.pending, (s) => { s.status = 'loading'; s.error = null; });
    b.addCase(login.fulfilled, (s, a: PayloadAction<AuthUser>) => { s.status = 'authenticated'; s.user = a.payload; });
    b.addCase(login.rejected, (s, a) => { s.status = 'unauthenticated'; s.error = a.payload ?? 'Login failed'; });
    b.addCase(register.pending, (s) => { s.status = 'loading'; s.error = null; });
    b.addCase(register.rejected, (s, a) => { s.status = 'unauthenticated'; s.error = a.payload ?? 'Registration failed'; });
    b.addCase(register.fulfilled, (s) => { s.status = 'unauthenticated'; s.error = null; });
    b.addCase(restoreSession.pending, (s) => { s.status = 'loading'; });
    b.addCase(restoreSession.fulfilled, (s, a) => { s.status = 'authenticated'; s.user = a.payload; });
    b.addCase(restoreSession.rejected, (s) => { s.status = 'unauthenticated'; s.user = null; });
    b.addCase(logout.fulfilled, (s) => { s.status = 'unauthenticated'; s.user = null; });
  },
});

export const { sessionExpired } = authSlice.actions;
export default authSlice.reducer;
