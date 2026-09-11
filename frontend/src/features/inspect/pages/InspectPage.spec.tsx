import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import formDefinitionReducer from '../formDefinitionSlice';
import { InspectPage } from './InspectPage';

const jsonRes = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const definition = [
  {
    id: 'sec1', title: 'Engine services', sortOrder: 10,
    fields: [{ id: 'f-oil', label: 'Oil change', type: 'CHECKLIST', required: false, sortOrder: 10, showInReport: true, config: {}, options: [] }],
  },
  {
    id: 'sec2', title: 'Brake wear', sortOrder: 20,
    fields: [{ id: 'f-fl', label: 'Front left', type: 'NUMBER', required: false, sortOrder: 10, showInReport: true, config: { unit: '%', min: 0, max: 100 }, options: [] }],
  },
];

const vehicle = {
  id: 'v1', regNumber: 'DW 769DN', brand: 'Toyota', model: 'Corolla', year: 2018,
  gearbox: 'AUTO', motivePower: 'PETROL', driveMode: 'FRONT', ownerName: null, ownerPhone: null, ownerEmail: null,
};

function renderPage() {
  const store = configureStore({ reducer: { formDefinition: formDefinitionReducer } });
  render(<Provider store={store}><MemoryRouter><InspectPage /></MemoryRouter></Provider>);
}

describe('InspectPage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('renders sections and fields from the form definition once a vehicle is picked', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonRes(200, definition))
      .mockResolvedValueOnce(jsonRes(200, vehicle));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    await screen.findByPlaceholderText(/enter registration/i);
    await userEvent.type(screen.getByPlaceholderText(/enter registration/i), 'DW769DN', { delay: 1 });
    expect(await screen.findByText('Engine services')).toBeInTheDocument();
    expect(screen.getByText('Brake wear')).toBeInTheDocument();
    expect(screen.getByText('Oil change')).toBeInTheDocument();
  });

  it('submits values for touched fields and navigates away on success', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonRes(200, definition))
      .mockResolvedValueOnce(jsonRes(200, vehicle))
      .mockResolvedValueOnce(jsonRes(201, { id: 'r1' }));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    await screen.findByPlaceholderText(/enter registration/i);
    await userEvent.type(screen.getByPlaceholderText(/enter registration/i), 'DW769DN', { delay: 1 });
    await userEvent.click(await screen.findByRole('button', { name: 'Done' }));
    await userEvent.click(screen.getByRole('button', { name: /save inspection/i }));

    const postCall = fetchMock.mock.calls.find((c) => c[1]?.method === 'POST' && String(c[0]).endsWith('/records'));
    expect(postCall).toBeTruthy();
    const body = JSON.parse(postCall![1].body);
    expect(body.vehicleId).toBe('v1');
    expect(body.values).toEqual([{ fieldId: 'f-oil', value: { done: true, urgent: false, later: false } }]);
  });

  it('maps a 400 validation error back onto the specific field', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonRes(200, definition))
      .mockResolvedValueOnce(jsonRes(200, vehicle))
      .mockResolvedValueOnce(jsonRes(400, { message: 'Invalid values', errors: [{ fieldId: 'f-fl', label: 'Front left', message: 'must be ≤ 100' }] }));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    await screen.findByPlaceholderText(/enter registration/i);
    await userEvent.type(screen.getByPlaceholderText(/enter registration/i), 'DW769DN', { delay: 1 });
    await screen.findByText('Brake wear');
    await userEvent.click(screen.getByRole('button', { name: /save inspection/i }));
    expect(await screen.findByText('must be ≤ 100')).toBeInTheDocument();
  });
});
