import { configureStore } from '@reduxjs/toolkit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import reducer, { fetchCompanyProfile, saveCompanyProfile } from './companySlice';

const jsonRes = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const buildStore = () => configureStore({ reducer: { company: reducer } });

describe('companySlice', () => {
  afterEach(() => vi.restoreAllMocks());

  it('fetch populates the profile', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonRes(200, { companyName: 'Smoke Garage Oy', tagline: null, addressLine1: null, addressLine2: null, postalCode: null, city: null, country: null, phone: null, email: null, website: null, businessId: null, vatId: null, logoPath: null })));
    const store = buildStore();
    await store.dispatch(fetchCompanyProfile());
    expect(store.getState().company.data?.companyName).toBe('Smoke Garage Oy');
  });

  it('save sets justSaved on success and clears it while saving again', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonRes(200, { companyName: 'New Name', tagline: null, addressLine1: null, addressLine2: null, postalCode: null, city: null, country: null, phone: null, email: null, website: null, businessId: null, vatId: null, logoPath: null })));
    const store = buildStore();
    await store.dispatch(saveCompanyProfile({ companyName: 'New Name', tagline: '', addressLine1: '', addressLine2: '', postalCode: '', city: '', country: '', phone: '', email: '', website: '', businessId: '', vatId: '' }));
    expect(store.getState().company.justSaved).toBe(true);
    expect(store.getState().company.data?.companyName).toBe('New Name');
  });

  it('a failed save surfaces an error and does not set justSaved', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonRes(400, { message: 'email must be a valid email' })));
    const store = buildStore();
    await store.dispatch(saveCompanyProfile({ ...({} as any), email: 'not-an-email' }));
    expect(store.getState().company.error).toBe('email must be a valid email');
    expect(store.getState().company.justSaved).toBe(false);
  });
});
