import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { apiFetch } from '../../lib/apiClient';
import type { VehicleDetail } from './types';

interface VehicleState { current: VehicleDetail | null; loading: boolean; error: string | null }
const initialState: VehicleState = { current: null, loading: false, error: null };

export const fetchVehicle = createAsyncThunk<VehicleDetail, string, { rejectValue: string }>(
  'vehicle/fetch',
  async (id, { rejectWithValue }) => {
    try {
      return await apiFetch<VehicleDetail>(`/vehicles/${id}`);
    } catch {
      return rejectWithValue('Could not load vehicle');
    }
  },
);

const vehicleSlice = createSlice({
  name: 'vehicle',
  initialState,
  reducers: { clearVehicle(s) { s.current = null; s.error = null; } },
  extraReducers: (b) => {
    b.addCase(fetchVehicle.pending, (s) => { s.loading = true; s.error = null; });
    b.addCase(fetchVehicle.fulfilled, (s, a) => { s.loading = false; s.current = a.payload; });
    b.addCase(fetchVehicle.rejected, (s, a) => { s.loading = false; s.error = a.payload ?? 'Could not load vehicle'; });
  },
});

export const { clearVehicle } = vehicleSlice.actions;
export default vehicleSlice.reducer;
