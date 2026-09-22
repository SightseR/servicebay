import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import authReducer from '../../auth/authSlice';
import { ProtectedRoute } from '../../shell/ProtectedRoute';
import { ProfilePage } from './ProfilePage';

const jsonRes = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const user = { id: 'u1', email: 'a@b.com', displayName: 'Admin One', role: 'ADMIN', status: 'ACTIVE', mustChangePassword: false, sid: 's1' };

function renderWith(u: typeof user, initialPath = '/profile') {
  const store = configureStore({ reducer: { auth: authReducer } as any, preloadedState: { auth: { user: u, status: 'authenticated', error: null } } as any });
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/" element={<ProtectedRoute><div>RECORDS HOME</div></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
  return store;
}

describe('ProfilePage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows account details and saves a new display name', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonRes(200, { ...user, displayName: 'Renamed' }));
    vi.stubGlobal('fetch', fetchMock);
    const store = renderWith(user);
    expect(screen.getByText('a@b.com')).toBeInTheDocument();
    const name = screen.getByLabelText('Name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Renamed');
    await userEvent.click(screen.getByRole('button', { name: /save name/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/me', expect.objectContaining({ method: 'PATCH' })));
    expect(await screen.findByText('Name saved.')).toBeInTheDocument();
    expect(store.getState().auth.user.displayName).toBe('Renamed');
  });

  it('rejects mismatched new passwords without calling the API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderWith(user);
    await userEvent.type(screen.getByLabelText('Current password'), 'OldPass123');
    await userEvent.type(screen.getByLabelText(/^New password/), 'NewPass12345');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'Different12345');
    await userEvent.click(screen.getByRole('button', { name: /^change password$/i }));
    expect(await screen.findByText(/don't match/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('changes the password and clears the must-change flag', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 })));
    const store = renderWith({ ...user, mustChangePassword: true });
    expect(screen.getByText(/reset by a manager/i)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Current password'), 'Temp1234abcd');
    await userEvent.type(screen.getByLabelText(/^New password/), 'NewPass12345');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'NewPass12345');
    await userEvent.click(screen.getByRole('button', { name: /^change password$/i }));
    expect(await screen.findByText(/password changed/i)).toBeInTheDocument();
    expect(store.getState().auth.user.mustChangePassword).toBe(false);
    expect(screen.queryByText(/reset by a manager/i)).not.toBeInTheDocument();
  });

  it('a must-change user is redirected from any other page to /profile', async () => {
    renderWith({ ...user, mustChangePassword: true }, '/');
    expect(await screen.findByText(/reset by a manager/i)).toBeInTheDocument();
    expect(screen.queryByText('RECORDS HOME')).not.toBeInTheDocument();
  });
});
