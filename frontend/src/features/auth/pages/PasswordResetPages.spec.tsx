import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import { ResetPasswordPage } from './ResetPasswordPage';

const jsonRes = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('ForgotPasswordPage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('posts the email and shows the same neutral confirmation regardless of account existence', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonRes(200, { ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText('Email'), 'someone@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send reset link/i }));
    expect(await screen.findByText(/if an account exists/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/forgot-password', expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: 'someone@example.com' });
  });
});

describe('ResetPasswordPage', () => {
  afterEach(() => vi.restoreAllMocks());
  const TOKEN = 'a'.repeat(64);
  const renderAt = (path: string) => render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="/reset-password" element={<ResetPasswordPage />} /></Routes>
    </MemoryRouter>,
  );

  it('treats a missing/short token as an invalid link without calling the API', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderAt('/reset-password?token=short');
    expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /set new password/i })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('submits token + new password and shows success', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    renderAt(`/reset-password?token=${TOKEN}`);
    await userEvent.type(screen.getByLabelText(/^New password/), 'BrandNew12345');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'BrandNew12345');
    await userEvent.click(screen.getByRole('button', { name: /set new password/i }));
    expect(await screen.findByText(/has been changed/i)).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ token: TOKEN, newPassword: 'BrandNew12345' });
  });

  it('maps a 401 to the friendly "invalid or expired" message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonRes(401, { message: 'This reset link is invalid or has expired' })));
    renderAt(`/reset-password?token=${TOKEN}`);
    await userEvent.type(screen.getByLabelText(/^New password/), 'BrandNew12345');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'BrandNew12345');
    await userEvent.click(screen.getByRole('button', { name: /set new password/i }));
    expect(await screen.findByText(/invalid or has expired/i)).toBeInTheDocument();
  });
});
