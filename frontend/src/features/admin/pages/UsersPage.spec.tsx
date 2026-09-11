import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';
import authReducer from '../../auth/authSlice';
import adminUsersReducer from '../usersSlice';
import { UsersPage } from './UsersPage';

const jsonRes = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const manager = { id: 'mgr-1', email: 'mgr@x', displayName: 'Manager', role: 'MANAGER', status: 'ACTIVE' };
const pendingUser = { id: 'u-1', email: 'new@x', displayName: 'New Admin', role: 'ADMIN', status: 'PENDING', approvedAt: null, createdAt: '2026-01-01T00:00:00Z', approvedBy: null };
const activeAdmin = { id: 'u-2', email: 'a@x', displayName: 'Active Admin', role: 'ADMIN', status: 'ACTIVE', approvedAt: '2026-01-01T00:00:00Z', createdAt: '2026-01-01T00:00:00Z', approvedBy: null };

function renderPage(users: unknown[]) {
  const store = configureStore({ reducer: { auth: authReducer, adminUsers: adminUsersReducer } as any, preloadedState: { auth: { user: manager, status: 'authenticated', error: null } } as any });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonRes(200, users)));
  render(<Provider store={store}><UsersPage /></Provider>);
  return store;
}

describe('UsersPage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lists pending users separately with an Approve action', async () => {
    renderPage([pendingUser]);
    expect(await screen.findByText('New Admin')).toBeInTheDocument();
    expect(screen.getByText('Awaiting approval')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
  });

  it('approving calls the API and moves the user into Team', async () => {
    renderPage([pendingUser]);
    await screen.findByText('New Admin');
    (fetch as any).mockResolvedValueOnce(jsonRes(200, { ...pendingUser, status: 'ACTIVE', approvedBy: { id: 'mgr-1', displayName: 'Manager' } }));
    await userEvent.click(screen.getByRole('button', { name: /approve/i }));
    await waitFor(() => expect(screen.queryByText('Awaiting approval')).not.toBeInTheDocument());
    expect(fetch).toHaveBeenLastCalledWith('/api/v1/users/u-1/approve', expect.objectContaining({ method: 'PATCH' }));
  });

  it('does not show role/disable controls on the current user\'s own row', async () => {
    renderPage([manager]);
    await screen.findByText('(you)');
    const row = screen.getByText('(you)').closest('div')!.parentElement!.parentElement!;
    expect(within(row).queryByRole('combobox')).not.toBeInTheDocument();
    expect(within(row).queryByRole('button', { name: /disable/i })).not.toBeInTheDocument();
  });

  it('shows a row-level error without clearing the list on a failed update', async () => {
    renderPage([activeAdmin]);
    await screen.findByText('Active Admin');
    (fetch as any).mockResolvedValueOnce(jsonRes(400, { message: 'At least one active manager is required' }));
    await userEvent.click(screen.getByRole('button', { name: /disable/i }));
    expect(await screen.findByText('At least one active manager is required')).toBeInTheDocument();
    expect(screen.getByText('Active Admin')).toBeInTheDocument();
  });
});
