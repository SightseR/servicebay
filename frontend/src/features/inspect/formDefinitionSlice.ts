import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiFetch } from '../../lib/apiClient';
import type { FormSectionDef } from './types';

interface State { sections: FormSectionDef[]; loading: boolean; error: string | null; includesInactive: boolean }
const initialState: State = { sections: [], loading: false, error: null, includesInactive: false };

/**
 * `includeInactive` is needed when editing an existing record: a field the record used
 * may since have been deactivated in the form builder, but its config/options are still
 * required to render and re-save that value (D3 — history must survive deactivation).
 */
export const fetchFormDefinition = createAsyncThunk<FormSectionDef[], { includeInactive?: boolean } | void, { rejectValue: string }>(
  'formDefinition/fetch',
  async (arg, { rejectWithValue }) => {
    try {
      return await apiFetch<FormSectionDef[]>(`/form/definition${arg?.includeInactive ? '?includeInactive=1' : ''}`);
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
    b.addCase(fetchFormDefinition.fulfilled, (s, a) => {
      s.loading = false;
      s.sections = a.payload;
      s.includesInactive = !!a.meta.arg?.includeInactive;
    });
    b.addCase(fetchFormDefinition.rejected, (s, a) => { s.loading = false; s.error = a.payload ?? 'Could not load the inspection form'; });
  },
});

export default slice.reducer;
