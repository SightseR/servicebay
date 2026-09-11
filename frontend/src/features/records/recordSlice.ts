import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiFetch, ApiError } from '../../lib/apiClient';
import type { RecordDetail } from './types';

interface State { current: RecordDetail | null; loading: boolean; saving: boolean; error: string | null; fieldErrors: Record<string, string> }
const initialState: State = { current: null, loading: false, saving: false, error: null, fieldErrors: {} };

export const fetchRecord = createAsyncThunk<RecordDetail, string, { rejectValue: string }>(
  'record/fetch',
  async (id, { rejectWithValue }) => {
    try { return await apiFetch<RecordDetail>(`/records/${id}`); }
    catch { return rejectWithValue('Could not load this record'); }
  },
);

export interface UpdateRecordInput {
  id: string;
  kilometers?: number | null;
  servicedAt?: string;
  values?: { fieldId: string; value: unknown }[];
}
interface FieldErrorBody { message: string; errors?: { fieldId: string; message: string }[] }

export const updateRecord = createAsyncThunk<RecordDetail, UpdateRecordInput, { rejectValue: { message: string; fieldErrors: Record<string, string> } }>(
  'record/update',
  async ({ id, ...dto }, { rejectWithValue }) => {
    try {
      return await apiFetch<RecordDetail>(`/records/${id}`, { method: 'PATCH', body: dto });
    } catch (e) {
      if (e instanceof ApiError) {
        const body = e.body as FieldErrorBody;
        return rejectWithValue({
          message: body.errors?.length ? 'Some fields need attention below.' : (body.message ?? 'Could not save changes'),
          fieldErrors: Object.fromEntries((body.errors ?? []).map((er) => [er.fieldId, er.message])),
        });
      }
      return rejectWithValue({ message: 'Could not save changes', fieldErrors: {} });
    }
  },
);

export const deleteRecord = createAsyncThunk<string, string, { rejectValue: string }>(
  'record/delete',
  async (id, { rejectWithValue }) => {
    try { await apiFetch(`/records/${id}`, { method: 'DELETE' }); return id; }
    catch (e) { return rejectWithValue(e instanceof ApiError ? e.message : 'Could not delete this record'); }
  },
);

const slice = createSlice({
  name: 'record',
  initialState,
  reducers: { clearRecord(s) { s.current = null; s.error = null; s.fieldErrors = {}; } },
  extraReducers: (b) => {
    b.addCase(fetchRecord.pending, (s) => { s.loading = true; s.error = null; });
    b.addCase(fetchRecord.fulfilled, (s, a) => { s.loading = false; s.current = a.payload; });
    b.addCase(fetchRecord.rejected, (s, a) => { s.loading = false; s.error = a.payload ?? 'Could not load this record'; });

    b.addCase(updateRecord.pending, (s) => { s.saving = true; s.error = null; s.fieldErrors = {}; });
    b.addCase(updateRecord.fulfilled, (s, a) => { s.saving = false; s.current = a.payload; });
    b.addCase(updateRecord.rejected, (s, a) => { s.saving = false; s.error = a.payload?.message ?? 'Could not save changes'; s.fieldErrors = a.payload?.fieldErrors ?? {}; });

    b.addCase(deleteRecord.pending, (s) => { s.saving = true; s.error = null; });
    b.addCase(deleteRecord.rejected, (s, a) => { s.saving = false; s.error = a.payload ?? 'Could not delete this record'; });
  },
});

export const { clearRecord } = slice.actions;
export default slice.reducer;
