import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiFetch, ApiError } from '../../../lib/apiClient';
import type { BuilderField, BuilderOption, BuilderSection, FieldConfig, FieldType } from './types';

interface State {
  sections: BuilderSection[];
  loading: boolean;
  error: string | null;
  busy: Record<string, boolean>;
  rowError: Record<string, string | undefined>;
}
const initialState: State = { sections: [], loading: false, error: null, busy: {}, rowError: {} };

const errMsg = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

export const fetchDefinition = createAsyncThunk<BuilderSection[], void, { rejectValue: string }>(
  'formBuilder/fetch',
  async (_, { rejectWithValue }) => {
    try { return await apiFetch<BuilderSection[]>('/form/definition?includeInactive=1'); }
    catch (e) { return rejectWithValue(errMsg(e, 'Could not load the form definition')); }
  },
);

// ---- sections ----
export const createSection = createAsyncThunk<BuilderSection, { titleEn: string; titleIt?: string | null }, { rejectValue: string }>(
  'formBuilder/createSection',
  async (dto, { rejectWithValue }) => {
    try { return await apiFetch<BuilderSection>('/form/sections', { method: 'POST', body: dto }); }
    catch (e) { return rejectWithValue(errMsg(e, 'Could not create section')); }
  },
);
export interface UpdateSectionInput { id: string; titleEn?: string; titleIt?: string | null; active?: boolean }
export const updateSection = createAsyncThunk<BuilderSection, UpdateSectionInput, { rejectValue: { id: string; message: string } }>(
  'formBuilder/updateSection',
  async ({ id, ...dto }, { rejectWithValue }) => {
    try { return await apiFetch<BuilderSection>(`/form/sections/${id}`, { method: 'PATCH', body: dto }); }
    catch (e) { return rejectWithValue({ id, message: errMsg(e, 'Could not update section') }); }
  },
);
export const deleteSection = createAsyncThunk<string, string, { rejectValue: { id: string; message: string } }>(
  'formBuilder/deleteSection',
  async (id, { rejectWithValue }) => {
    try { await apiFetch(`/form/sections/${id}`, { method: 'DELETE' }); return id; }
    catch (e) { return rejectWithValue({ id, message: errMsg(e, 'Could not delete section') }); }
  },
);
export const reorderSections = createAsyncThunk<void, string[], { rejectValue: string }>(
  'formBuilder/reorderSections',
  async (ids, { rejectWithValue }) => {
    try { await apiFetch('/form/sections/reorder', { method: 'POST', body: { ids } }); }
    catch (e) { return rejectWithValue(errMsg(e, 'Could not reorder sections')); }
  },
);

// ---- fields ----
export interface CreateFieldInput {
  sectionId: string; labelEn: string; labelIt?: string | null; type: FieldType;
  required?: boolean; showInReport?: boolean; config?: FieldConfig; options?: { labelEn: string; labelIt?: string | null }[];
}
export const createField = createAsyncThunk<BuilderField & { sectionId: string }, CreateFieldInput, { rejectValue: { id: string; message: string } }>(
  'formBuilder/createField',
  async ({ sectionId, ...dto }, { rejectWithValue }) => {
    try {
      const field = await apiFetch<BuilderField>(`/form/sections/${sectionId}/fields`, { method: 'POST', body: dto });
      return { ...field, sectionId };
    } catch (e) { return rejectWithValue({ id: sectionId, message: errMsg(e, 'Could not create field') }); }
  },
);
export interface UpdateFieldInput { id: string; labelEn?: string; labelIt?: string | null; type?: FieldType; required?: boolean; showInReport?: boolean; active?: boolean; config?: FieldConfig }
export const updateField = createAsyncThunk<BuilderField, UpdateFieldInput, { rejectValue: { id: string; message: string } }>(
  'formBuilder/updateField',
  async ({ id, ...dto }, { rejectWithValue }) => {
    try { return await apiFetch<BuilderField>(`/form/fields/${id}`, { method: 'PATCH', body: dto }); }
    catch (e) { return rejectWithValue({ id, message: errMsg(e, 'Could not update field') }); }
  },
);
export const deleteField = createAsyncThunk<string, string, { rejectValue: { id: string; message: string } }>(
  'formBuilder/deleteField',
  async (id, { rejectWithValue }) => {
    try { await apiFetch(`/form/fields/${id}`, { method: 'DELETE' }); return id; }
    catch (e) { return rejectWithValue({ id, message: errMsg(e, 'Could not delete field') }); }
  },
);
export const reorderFields = createAsyncThunk<void, { sectionId: string; ids: string[] }, { rejectValue: string }>(
  'formBuilder/reorderFields',
  async ({ sectionId, ids }, { rejectWithValue }) => {
    try { await apiFetch(`/form/sections/${sectionId}/fields/reorder`, { method: 'POST', body: { ids } }); }
    catch (e) { return rejectWithValue(errMsg(e, 'Could not reorder fields')); }
  },
);

// ---- options ----
export const createOption = createAsyncThunk<BuilderOption & { fieldId: string }, { fieldId: string; labelEn: string; labelIt?: string | null }, { rejectValue: { id: string; message: string } }>(
  'formBuilder/createOption',
  async ({ fieldId, ...dto }, { rejectWithValue }) => {
    try {
      const option = await apiFetch<BuilderOption>(`/form/fields/${fieldId}/options`, { method: 'POST', body: dto });
      return { ...option, fieldId };
    } catch (e) { return rejectWithValue({ id: fieldId, message: errMsg(e, 'Could not add option') }); }
  },
);
export interface UpdateOptionInput { id: string; fieldId: string; labelEn?: string; labelIt?: string | null; active?: boolean }
export const updateOption = createAsyncThunk<BuilderOption & { fieldId: string }, UpdateOptionInput, { rejectValue: { id: string; message: string } }>(
  'formBuilder/updateOption',
  async ({ id, fieldId, ...dto }, { rejectWithValue }) => {
    try {
      const option = await apiFetch<BuilderOption>(`/form/options/${id}`, { method: 'PATCH', body: dto });
      return { ...option, fieldId };
    } catch (e) { return rejectWithValue({ id, message: errMsg(e, 'Could not update option') }); }
  },
);
export const deleteOption = createAsyncThunk<{ id: string; fieldId: string }, { id: string; fieldId: string }, { rejectValue: { id: string; message: string } }>(
  'formBuilder/deleteOption',
  async ({ id, fieldId }, { rejectWithValue }) => {
    try { await apiFetch(`/form/options/${id}`, { method: 'DELETE' }); return { id, fieldId }; }
    catch (e) { return rejectWithValue({ id, message: errMsg(e, 'Could not delete option') }); }
  },
);
export const reorderOptions = createAsyncThunk<void, { fieldId: string; ids: string[] }, { rejectValue: string }>(
  'formBuilder/reorderOptions',
  async ({ fieldId, ids }, { rejectWithValue }) => {
    try { await apiFetch(`/form/fields/${fieldId}/options/reorder`, { method: 'POST', body: { ids } }); }
    catch (e) { return rejectWithValue(errMsg(e, 'Could not reorder options')); }
  },
);

const slice = createSlice({
  name: 'formBuilder',
  initialState,
  reducers: { clearRowError(state, action: { payload: string }) { delete state.rowError[action.payload]; } },
  extraReducers: (b) => {
    b.addCase(fetchDefinition.pending, (s) => { s.loading = true; s.error = null; });
    b.addCase(fetchDefinition.fulfilled, (s, a) => { s.loading = false; s.sections = a.payload; s.busy = {}; });
    b.addCase(fetchDefinition.rejected, (s, a) => { s.loading = false; s.error = a.payload ?? 'Could not load the form definition'; });

    // After any mutation, simplest correct approach is to refetch — the definition tree is
    // small (a handful of sections) and this avoids subtle client-side tree-patching bugs.
    // Busy/error state is still tracked per-row for responsive UI while the request is in flight.
    b.addCase(createSection.pending, (s) => { s.busy['__new_section'] = true; });
    b.addCase(createSection.fulfilled, (s) => { s.busy['__new_section'] = false; });
    b.addCase(createSection.rejected, (s, a) => { s.busy['__new_section'] = false; s.error = a.payload ?? 'Could not create section'; });

    b.addCase(updateSection.pending, (s, a) => { s.busy[a.meta.arg.id] = true; });
    b.addCase(updateSection.rejected, (s, a) => { const id = a.payload?.id; if (id) { s.busy[id] = false; s.rowError[id] = a.payload?.message; } });
    b.addCase(deleteSection.pending, (s, a) => { s.busy[a.meta.arg] = true; });
    b.addCase(deleteSection.rejected, (s, a) => { const id = a.payload?.id; if (id) { s.busy[id] = false; s.rowError[id] = a.payload?.message; } });

    b.addCase(createField.pending, (s, a) => { s.busy[a.meta.arg.sectionId] = true; });
    b.addCase(createField.rejected, (s, a) => { const id = a.payload?.id; if (id) { s.busy[id] = false; s.rowError[id] = a.payload?.message; } });
    b.addCase(updateField.pending, (s, a) => { s.busy[a.meta.arg.id] = true; });
    b.addCase(updateField.rejected, (s, a) => { const id = a.payload?.id; if (id) { s.busy[id] = false; s.rowError[id] = a.payload?.message; } });
    b.addCase(deleteField.pending, (s, a) => { s.busy[a.meta.arg] = true; });
    b.addCase(deleteField.rejected, (s, a) => { const id = a.payload?.id; if (id) { s.busy[id] = false; s.rowError[id] = a.payload?.message; } });

    b.addCase(createOption.pending, (s, a) => { s.busy[a.meta.arg.fieldId] = true; });
    b.addCase(createOption.rejected, (s, a) => { const id = a.payload?.id; if (id) { s.busy[id] = false; s.rowError[id] = a.payload?.message; } });
    b.addCase(updateOption.pending, (s, a) => { s.busy[a.meta.arg.id] = true; });
    b.addCase(updateOption.rejected, (s, a) => { const id = a.payload?.id; if (id) { s.busy[id] = false; s.rowError[id] = a.payload?.message; } });
    b.addCase(deleteOption.pending, (s, a) => { s.busy[a.meta.arg.id] = true; });
    b.addCase(deleteOption.rejected, (s, a) => { const id = a.payload?.id; if (id) { s.busy[id] = false; s.rowError[id] = a.payload?.message; } });
  },
});

export const { clearRowError } = slice.actions;
export default slice.reducer;
