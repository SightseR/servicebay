import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import authReducer from '../../auth/authSlice';
import formDefinitionReducer from '../../inspect/formDefinitionSlice';
import recordReducer from '../recordSlice';
import { RecordDetailPage } from './RecordDetailPage';

const jsonRes = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const admin1 = { id: 'u1', email: 'a@x', displayName: 'Admin One', role: 'ADMIN', status: 'ACTIVE', mustChangePassword: false };
const admin2 = { id: 'u2', email: 'b@x', displayName: 'Admin Two', role: 'ADMIN', status: 'ACTIVE', mustChangePassword: false };
const manager = { id: 'm1', email: 'm@x', displayName: 'Manager', role: 'MANAGER', status: 'ACTIVE', mustChangePassword: false };

const baseRecord = {
  id: 'r1', kilometers: 123456, gearbox: 'AUTO', motivePower: 'PETROL', driveMode: 'FRONT',
  servicedAt: '2026-06-01T10:00:00Z', legacyId: null, createdAt: '2026-06-01T10:00:00Z', updatedAt: '2026-06-01T10:00:00Z',
  vehicle: { id: 'v1', regNumber: 'DW 769DN', brand: 'Toyota', model: 'Corolla', year: 2018, gearbox: 'AUTO', motivePower: 'PETROL', driveMode: 'FRONT', ownerName: null, ownerPhone: null, ownerEmail: null },
  createdBy: { id: 'u1', displayName: 'Admin One' }, updatedBy: { id: 'u1', displayName: 'Admin One' },
  sections: [{ id: 'sec1', titleEn: 'Engine services', titleIt: null, sortOrder: 10, items: [{ fieldId: 'f-oil', labelEn: 'Oil change', labelIt: null, type: 'CHECKLIST', sortOrder: 10, showInReport: true, value: { done: true, urgent: false, later: false } }] }],
  values: [{ fieldId: 'f-oil', value: { done: true, urgent: false, later: false } }],
};

function renderPage(currentUser: unknown, recordOverrides: Partial<typeof baseRecord> = {}) {
  const store = configureStore({
    reducer: { auth: authReducer, record: recordReducer, formDefinition: formDefinitionReducer } as any,
    preloadedState: { auth: { user: currentUser, status: 'authenticated', error: null } } as any,
  });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonRes(200, { ...baseRecord, ...recordOverrides })));
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/records/r1']}>
        <Routes><Route path="/records/:id" element={<RecordDetailPage />} /></Routes>
      </MemoryRouter>
    </Provider>,
  );
  return store;
}

describe('RecordDetailPage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('shows the vehicle, spec, and recorded values read-only', async () => {
    renderPage(admin1);
    expect(await screen.findByText('DW 769DN')).toBeInTheDocument();
    expect(screen.getByText(/Toyota Corolla/)).toBeInTheDocument();
    expect(screen.getByText('Oil change')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText(/Recorded by Admin One/)).toBeInTheDocument();
  });

  it('shows Delete for the creator', async () => {
    renderPage(admin1);
    await screen.findByText('DW 769DN');
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('hides Delete for another admin', async () => {
    renderPage(admin2);
    await screen.findByText('DW 769DN');
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('shows Delete for a manager regardless of creator', async () => {
    renderPage(manager);
    await screen.findByText('DW 769DN');
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('entering edit mode fetches the full form definition and pre-fills existing values', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonRes(200, baseRecord))
      .mockResolvedValueOnce(jsonRes(200, [
        { id: 'sec1', titleEn: 'Engine services', titleIt: null, sortOrder: 10, fields: [{ id: 'f-oil', labelEn: 'Oil change', labelIt: null, type: 'CHECKLIST', required: false, sortOrder: 10, showInReport: true, config: {}, options: [] }] },
      ]));
    vi.stubGlobal('fetch', fetchMock);
    const store = configureStore({
      reducer: { auth: authReducer, record: recordReducer, formDefinition: formDefinitionReducer } as any,
      preloadedState: { auth: { user: admin1, status: 'authenticated', error: null } } as any,
    });
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/records/r1']}>
          <Routes><Route path="/records/:id" element={<RecordDetailPage />} /></Routes>
        </MemoryRouter>
      </Provider>,
    );
    await screen.findByText('DW 769DN');
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    await waitFor(() => expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('includeInactive=1'))).toBe(true));
    const doneBtn = await screen.findByRole('button', { name: 'Done' });
    expect(doneBtn.className).toContain('border-moss'); // pre-filled as active from the stored value
  });

  it('saving PATCHes the record and returns to view mode', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonRes(200, baseRecord))
      .mockResolvedValueOnce(jsonRes(200, [
        { id: 'sec1', titleEn: 'Engine services', titleIt: null, sortOrder: 10, fields: [{ id: 'f-oil', labelEn: 'Oil change', labelIt: null, type: 'CHECKLIST', required: false, sortOrder: 10, showInReport: true, config: {}, options: [] }] },
      ]))
      .mockResolvedValueOnce(jsonRes(200, { ...baseRecord, kilometers: 130000 }));
    vi.stubGlobal('fetch', fetchMock);
    const store = configureStore({
      reducer: { auth: authReducer, record: recordReducer, formDefinition: formDefinitionReducer } as any,
      preloadedState: { auth: { user: admin1, status: 'authenticated', error: null } } as any,
    });
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/records/r1']}>
          <Routes><Route path="/records/:id" element={<RecordDetailPage />} /></Routes>
        </MemoryRouter>
      </Provider>,
    );
    await screen.findByText('DW 769DN');
    await userEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    await screen.findByRole('button', { name: 'Done' });
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument());
    const patchCall = fetchMock.mock.calls.find((c) => c[1]?.method === 'PATCH');
    expect(patchCall).toBeTruthy();
    expect(JSON.parse(patchCall![1].body).kilometers).toBe(123456);
  });
});
