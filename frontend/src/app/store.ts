import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import adminUsersReducer from '../features/admin/usersSlice';

export const store = configureStore({ reducer: { auth: authReducer, adminUsers: adminUsersReducer } });
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
