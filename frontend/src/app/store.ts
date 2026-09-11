import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import adminUsersReducer from '../features/admin/usersSlice';
import recordsReducer from '../features/records/recordsSlice';
import vehicleReducer from '../features/records/vehicleSlice';
import formDefinitionReducer from '../features/inspect/formDefinitionSlice';

export const store = configureStore({ reducer: { auth: authReducer, adminUsers: adminUsersReducer, records: recordsReducer, vehicle: vehicleReducer, formDefinition: formDefinitionReducer } });
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
