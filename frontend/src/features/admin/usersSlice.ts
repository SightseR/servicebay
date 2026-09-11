import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiFetch, ApiError } from '../../lib/apiClient';

export type Role = 'MANAGER' | 'ADMIN';
export type UserStatus = 'PENDING' | 'ACTIVE' | 'DISABLED';

export interface ManagedUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  status: UserStatus;
  approvedAt: string | null;
  createdAt: string;
  approvedBy: { id: string; displayName: string } | null;
}

interface UsersState {
  items: ManagedUser[];
  loading: boolean;
  error: string | null;
  /** per-user id, set while an approve/update request for that row is in flight */
  rowBusy: Record<string, boolean>;
  /** per-user id, last action error so it can be shown inline on that row */
  rowError: Record<string, string | undefined>;
}
const initialState: UsersState = { items: [], loading: false, error: null, rowBusy: {}, rowError: {} };

export const fetchUsers = createAsyncThunk<ManagedUser[], void, { rejectValue: string }>(
  'admin/users/fetch',
  async (_, { rejectWithValue }) => {
    try {
      return await apiFetch<ManagedUser[]>('/users');
    } catch (e) {
      return rejectWithValue(e instanceof ApiError ? e.message : 'Could not load users');
    }
  },
);

export const approveUser = createAsyncThunk<ManagedUser, string, { rejectValue: { id: string; message: string } }>(
  'admin/users/approve',
  async (id, { rejectWithValue }) => {
    try {
      return await apiFetch<ManagedUser>(`/users/${id}/approve`, { method: 'PATCH' });
    } catch (e) {
      return rejectWithValue({ id, message: e instanceof ApiError ? e.message : 'Approval failed' });
    }
  },
);

export interface UpdateUserInput { id: string; role?: Role; status?: 'ACTIVE' | 'DISABLED'; displayName?: string }
export const updateUser = createAsyncThunk<ManagedUser, UpdateUserInput, { rejectValue: { id: string; message: string } }>(
  'admin/users/update',
  async ({ id, ...dto }, { rejectWithValue }) => {
    try {
      return await apiFetch<ManagedUser>(`/users/${id}`, { method: 'PATCH', body: dto });
    } catch (e) {
      return rejectWithValue({ id, message: e instanceof ApiError ? e.message : 'Update failed' });
    }
  },
);

const usersSlice = createSlice({
  name: 'adminUsers',
  initialState,
  reducers: {
    clearRowError(state, action: { payload: string }) { delete state.rowError[action.payload]; },
  },
  extraReducers: (b) => {
    b.addCase(fetchUsers.pending, (s) => { s.loading = true; s.error = null; });
    b.addCase(fetchUsers.fulfilled, (s, a) => { s.loading = false; s.items = a.payload; });
    b.addCase(fetchUsers.rejected, (s, a) => { s.loading = false; s.error = a.payload ?? 'Could not load users'; });

    b.addCase(approveUser.pending, (s, a) => { s.rowBusy[a.meta.arg] = true; });
    b.addCase(updateUser.pending, (s, a) => { s.rowBusy[a.meta.arg.id] = true; });
    for (const thunk of [approveUser, updateUser]) {
      b.addCase(thunk.fulfilled, (s, a) => {
        const id = a.payload.id;
        s.rowBusy[id] = false;
        delete s.rowError[id];
        const idx = s.items.findIndex((u) => u.id === id);
        if (idx >= 0) s.items[idx] = a.payload;
      });
      b.addCase(thunk.rejected, (s, a) => {
        const id = a.payload?.id;
        if (id) { s.rowBusy[id] = false; s.rowError[id] = a.payload?.message; }
      });
    }
  },
});

export const { clearRowError } = usersSlice.actions;
export default usersSlice.reducer;
