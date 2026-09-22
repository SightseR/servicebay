import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import adminUsersReducer from '../features/admin/usersSlice';
import recordsReducer from '../features/records/recordsSlice';
import vehicleReducer from '../features/records/vehicleSlice';
import formDefinitionReducer from '../features/inspect/formDefinitionSlice';
import recordReducer from '../features/records/recordSlice';
import formBuilderReducer from '../features/admin/form-builder/formBuilderSlice';
import companyReducer from '../features/admin/company/companySlice';

export const store = configureStore({ reducer: { auth: authReducer, adminUsers: adminUsersReducer, records: recordsReducer, vehicle: vehicleReducer, formDefinition: formDefinitionReducer, record: recordReducer, formBuilder: formBuilderReducer, company: companyReducer } });
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
