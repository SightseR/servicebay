import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import recordsReducer from '../recordsSlice';
import vehicleReducer from '../vehicleSlice';
import { RecordsPage } from './RecordsPage';

const jsonRes = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const page1 = {
  items: [
    { id: 'r1', servicedAt: '2026-06-01T10:00:00Z', kilometers: 123456, legacyId: null, createdAt: '2026-06-01T10:00:00Z',
      vehicle: { id: 'v1', regNumber: 'DW 769DN', brand: 'Toyota', model: 'Corolla', year: 2018, ownerName: 'Jane Doe' },
      createdBy: { id: 'u1', displayName: 'Admin' }, valueCount: 5 },
  ],
  total: 1, page: 1, pageSize: 20, pages: 1,
};

function renderPage() {
  const store = configureStore({ reducer: { records: recordsReducer, vehicle: vehicleReducer } });
  render(<Provider store={store}><MemoryRouter><RecordsPage /></MemoryRouter></Provider>);
  return store;
}

describe('RecordsPage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('loads and displays records on mount', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonRes(200, page1)));
    renderPage();
    expect(await screen.findByText('DW 769DN')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('123,456 km')).toBeInTheDocument();
  });

  it('debounces search input into a single query with q=', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = vi.fn().mockResolvedValue(jsonRes(200, { ...page1, items: [] }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup({ delay: null });
    renderPage();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await user.type(screen.getByPlaceholderText(/search by registration/i), 'dw769');
    // still within debounce window: no new calls yet beyond the initial mount fetch
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(350);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1][0]).toContain('q=dw769');
    vi.useRealTimers();
  });

  it('clicking a row opens the vehicle history drawer and fetches the vehicle', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonRes(200, page1))
      .mockResolvedValueOnce(jsonRes(200, {
        id: 'v1', regNumber: 'DW 769DN', brand: 'Toyota', model: 'Corolla', year: 2018,
        gearbox: 'AUTO', motivePower: 'PETROL', driveMode: 'FRONT',
        ownerName: 'Jane Doe', ownerPhone: '+358401234567', ownerEmail: null,
        createdAt: '', updatedAt: '',
        records: [{ id: 'r1', servicedAt: '2026-06-01T10:00:00Z', kilometers: 123456, createdBy: null }],
      }));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    await userEvent.click(await screen.findByText('DW 769DN'));
    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/vehicles/v1', expect.anything()));
    expect(await screen.findByText((_, el) => el?.tagName === 'P' && el.textContent === 'Toyota Corolla · 2018')).toBeInTheDocument();
    expect(screen.getAllByText(/Jane Doe/).length).toBeGreaterThan(0);
  });

  it('shows an empty state message when there are no records', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonRes(200, { items: [], total: 0, page: 1, pageSize: 20, pages: 1 })));
    renderPage();
    expect(await screen.findByText(/no inspections yet/i)).toBeInTheDocument();
  });
});
