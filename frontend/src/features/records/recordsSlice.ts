import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiFetch } from '../../lib/apiClient';
import type { Paginated, RecordListItem } from './types';

export interface RecordsQuery { q?: string; page: number; pageSize: number }

interface RecordsState {
  data: Paginated<RecordListItem> | null;
  loading: boolean;
  error: string | null;
}
const initialState: RecordsState = { data: null, loading: false, error: null };

const toQueryString = (q: RecordsQuery) => {
  const params = new URLSearchParams({ page: String(q.page), pageSize: String(q.pageSize) });
  if (q.q) params.set('q', q.q);
  return params.toString();
};

export const fetchRecords = createAsyncThunk<Paginated<RecordListItem>, RecordsQuery, { rejectValue: string }>(
  'records/fetch',
  async (query, { rejectWithValue }) => {
    try {
      return await apiFetch<Paginated<RecordListItem>>(`/records?${toQueryString(query)}`);
    } catch {
      return rejectWithValue('Could not load records');
    }
  },
);

const recordsSlice = createSlice({
  name: 'records',
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchRecords.pending, (s) => { s.loading = true; s.error = null; });
    b.addCase(fetchRecords.fulfilled, (s, a) => { s.loading = false; s.data = a.payload; });
    b.addCase(fetchRecords.rejected, (s, a) => { s.loading = false; s.error = a.payload ?? 'Could not load records'; });
  },
});

export default recordsSlice.reducer;
export { toQueryString as recordsQueryString };
