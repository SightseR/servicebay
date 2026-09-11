import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiFetch } from '../../lib/apiClient';
import type { FormSectionDef } from './types';

interface State { sections: FormSectionDef[]; loading: boolean; error: string | null }
const initialState: State = { sections: [], loading: false, error: null };

export const fetchFormDefinition = createAsyncThunk<FormSectionDef[], void, { rejectValue: string }>(
  'formDefinition/fetch',
  async (_, { rejectWithValue }) => {
    try {
      return await apiFetch<FormSectionDef[]>('/form/definition');
    } catch {
      return rejectWithValue('Could not load the inspection form');
    }
  },
);

const slice = createSlice({
  name: 'formDefinition',
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchFormDefinition.pending, (s) => { s.loading = true; s.error = null; });
    b.addCase(fetchFormDefinition.fulfilled, (s, a) => { s.loading = false; s.sections = a.payload; });
    b.addCase(fetchFormDefinition.rejected, (s, a) => { s.loading = false; s.error = a.payload ?? 'Could not load the inspection form'; });
  },
});

export default slice.reducer;
