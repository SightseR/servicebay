import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';
import companyReducer from '../companySlice';
import { CompanyProfilePage } from './CompanyProfilePage';

const jsonRes = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const profile = {
  companyName: 'Smoke Garage Oy', tagline: 'Fixed right, every time', addressLine1: null, addressLine2: null,
  postalCode: null, city: null, country: null, phone: '+358 40 000 0000', email: null, website: null,
  businessId: null, vatId: null, logoPath: null,
};

function renderPage() {
  const store = configureStore({ reducer: { company: companyReducer } });
  render(<Provider store={store}><CompanyProfilePage /></Provider>);
}

describe('CompanyProfilePage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('loads the profile into the form fields, grouped into panels', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonRes(200, profile)));
    renderPage();
    expect(await screen.findByDisplayValue('Smoke Garage Oy')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Fixed right, every time')).toBeInTheDocument();
    expect(screen.getByText('Identity')).toBeInTheDocument();
    expect(screen.getByText('Contact')).toBeInTheDocument();
    expect(screen.getByText('Legal')).toBeInTheDocument();
  });

  it('editing a field and saving sends the full form to PUT /company', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonRes(200, profile))
      .mockResolvedValueOnce(jsonRes(200, { ...profile, companyName: 'Renamed Garage' }));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    const nameInput = await screen.findByDisplayValue('Smoke Garage Oy');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Renamed Garage');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [url, opts] = fetchMock.mock.calls[1];
    expect(url).toBe('/api/v1/company');
    expect(opts.method).toBe('PUT');
    const body = JSON.parse(opts.body);
    expect(body.companyName).toBe('Renamed Garage');
    expect(body.phone).toBe('+358 40 000 0000'); // untouched fields still round-trip

    expect(await screen.findByText('Saved.')).toBeInTheDocument();
  });

  it('shows a server error without losing the entered data', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonRes(200, profile))
      .mockResolvedValueOnce(jsonRes(400, { message: 'website must be a valid URL' }));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    await screen.findByDisplayValue('Smoke Garage Oy');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByText('website must be a valid URL')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Smoke Garage Oy')).toBeInTheDocument();
  });
});

describe('CompanyProfilePage — whitelist regression', () => {
  afterEach(() => vi.restoreAllMocks());

  it('never sends id/updatedAt back to PUT /company, even though GET /company returns them', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonRes(200, { id: 'default', ...profile, updatedAt: '2026-01-01T00:00:00Z' }))
      .mockResolvedValueOnce(jsonRes(200, profile));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    await screen.findByDisplayValue('Smoke Garage Oy');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body).not.toHaveProperty('id');
    expect(body).not.toHaveProperty('updatedAt');
    expect(body).not.toHaveProperty('logoPath');
    expect(Object.keys(body).sort()).toEqual([
      'addressLine1', 'addressLine2', 'businessId', 'city', 'companyName', 'country',
      'email', 'phone', 'postalCode', 'tagline', 'vatId', 'website',
    ]);
  });
});

describe('CompanyProfilePage — logo', () => {
  afterEach(() => vi.restoreAllMocks());

  it('uploads the chosen file as multipart form-data to POST /company/logo and shows the result', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonRes(200, profile))
      .mockResolvedValueOnce(jsonRes(201, { ...profile, logoPath: '/uploads/company/logo-abc.png' }));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    await screen.findByDisplayValue('Smoke Garage Oy');
    expect(screen.getByText(/no logo yet/i)).toBeInTheDocument();

    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'logo.png', { type: 'image/png' });
    await userEvent.upload(screen.getByLabelText('Upload logo'), file);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [url, opts] = fetchMock.mock.calls[1];
    expect(url).toBe('/api/v1/company/logo');
    expect(opts.method).toBe('POST');
    expect(opts.body).toBeInstanceOf(FormData);
    expect((opts.body as FormData).get('logo')).toBeInstanceOf(File);
    expect((opts.headers as Record<string, string>)['Content-Type']).toBeUndefined(); // browser sets the multipart boundary
    expect(await screen.findByRole('button', { name: /replace logo/i })).toBeInTheDocument();
  });

  it('removing the logo calls DELETE and returns to the empty state', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonRes(200, { ...profile, logoPath: '/uploads/company/logo-abc.png' }))
      .mockResolvedValueOnce(jsonRes(200, profile));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /remove logo/i }));
    await waitFor(() => expect(fetchMock.mock.calls[1][1].method).toBe('DELETE'));
    expect(await screen.findByText(/no logo yet/i)).toBeInTheDocument();
  });
});
