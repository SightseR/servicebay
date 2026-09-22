import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiFetch, ApiError } from '../../../lib/apiClient';
import type { CompanyProfile, CompanyProfileInput } from './types';

interface State { data: CompanyProfile | null; loading: boolean; saving: boolean; logoBusy: boolean; error: string | null; justSaved: boolean }
const initialState: State = { data: null, loading: false, saving: false, logoBusy: false, error: null, justSaved: false };

export const fetchCompanyProfile = createAsyncThunk<CompanyProfile, void, { rejectValue: string }>(
  'company/fetch',
  async (_, { rejectWithValue }) => {
    try { return await apiFetch<CompanyProfile>('/company'); }
    catch (e) { return rejectWithValue(e instanceof ApiError ? e.message : 'Could not load the company profile'); }
  },
);

export const saveCompanyProfile = createAsyncThunk<CompanyProfile, CompanyProfileInput, { rejectValue: string }>(
  'company/save',
  async (dto, { rejectWithValue }) => {
    try { return await apiFetch<CompanyProfile>('/company', { method: 'PUT', body: dto }); }
    catch (e) { return rejectWithValue(e instanceof ApiError ? e.message : 'Could not save the company profile'); }
  },
);

export const uploadLogo = createAsyncThunk<CompanyProfile, File, { rejectValue: string }>(
  'company/uploadLogo',
  async (file, { rejectWithValue }) => {
    try {
      const form = new FormData();
      form.append('logo', file);
      return await apiFetch<CompanyProfile>('/company/logo', { method: 'POST', body: form });
    } catch (e) { return rejectWithValue(e instanceof ApiError ? e.message : 'Could not upload the logo'); }
  },
);

export const removeLogo = createAsyncThunk<CompanyProfile, void, { rejectValue: string }>(
  'company/removeLogo',
  async (_, { rejectWithValue }) => {
    try { return await apiFetch<CompanyProfile>('/company/logo', { method: 'DELETE' }); }
    catch (e) { return rejectWithValue(e instanceof ApiError ? e.message : 'Could not remove the logo'); }
  },
);

const slice = createSlice({
  name: 'company',
  initialState,
  reducers: { clearJustSaved(s) { s.justSaved = false; } },
  extraReducers: (b) => {
    b.addCase(fetchCompanyProfile.pending, (s) => { s.loading = true; s.error = null; });
    b.addCase(fetchCompanyProfile.fulfilled, (s, a) => { s.loading = false; s.data = a.payload; });
    b.addCase(fetchCompanyProfile.rejected, (s, a) => { s.loading = false; s.error = a.payload ?? 'Could not load the company profile'; });

    b.addCase(saveCompanyProfile.pending, (s) => { s.saving = true; s.error = null; s.justSaved = false; });
    b.addCase(saveCompanyProfile.fulfilled, (s, a) => { s.saving = false; s.data = a.payload; s.justSaved = true; });
    b.addCase(saveCompanyProfile.rejected, (s, a) => { s.saving = false; s.error = a.payload ?? 'Could not save the company profile'; });

    for (const thunk of [uploadLogo, removeLogo]) {
      b.addCase(thunk.pending, (s) => { s.logoBusy = true; s.error = null; });
      b.addCase(thunk.fulfilled, (s, a) => { s.logoBusy = false; s.data = a.payload; });
      b.addCase(thunk.rejected, (s, a) => { s.logoBusy = false; s.error = a.payload ?? 'Logo update failed'; });
    }
  },
});

export const { clearJustSaved } = slice.actions;
export default slice.reducer;
