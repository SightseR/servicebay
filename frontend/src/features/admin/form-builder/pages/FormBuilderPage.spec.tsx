import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';
import formBuilderReducer from '../formBuilderSlice';
import { FormBuilderPage } from './FormBuilderPage';

const jsonRes = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const emptySection = { id: 'sec1', titleEn: 'Engine services', titleIt: 'Servizi motore', sortOrder: 10, active: true, fields: [] };

function renderPage() {
  const store = configureStore({ reducer: { formBuilder: formBuilderReducer } });
  render(<Provider store={store}><FormBuilderPage /></Provider>);
  return store;
}

describe('FormBuilderPage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lists sections with both language titles resolvable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonRes(200, [emptySection])));
    renderPage();
    expect(await screen.findByText('Engine services')).toBeInTheDocument();
  });

  it('creating a field: filling the English and Italian name boxes sends both to the API', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonRes(200, [emptySection]))
      .mockResolvedValueOnce(jsonRes(201, { id: 'f1', sectionId: 'sec1', labelEn: 'Oil change', labelIt: 'Cambio olio', type: 'CHECKLIST', required: false, sortOrder: 10, active: true, showInReport: true, config: {}, options: [] }))
      .mockResolvedValueOnce(jsonRes(200, [{ ...emptySection, fields: [{ id: 'f1', labelEn: 'Oil change', labelIt: 'Cambio olio', type: 'CHECKLIST', required: false, sortOrder: 10, active: true, showInReport: true, config: {}, options: [] }] }]));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    await screen.findByText('Engine services');
    await userEvent.click(screen.getByRole('button', { name: /add field/i }));

    const englishBox = screen.getByLabelText('English name');
    const italianBox = screen.getByLabelText('Italian name (optional)');
    await userEvent.type(englishBox, 'Oil change');
    await userEvent.type(italianBox, 'Cambio olio');

    const addButtons = screen.getAllByRole('button', { name: /add field/i });
    await userEvent.click(addButtons[addButtons.length - 1]);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const createCall = fetchMock.mock.calls[1];
    expect(createCall[0]).toBe('/api/v1/form/sections/sec1/fields');
    const body = JSON.parse(createCall[1].body);
    expect(body.labelEn).toBe('Oil change');
    expect(body.labelIt).toBe('Cambio olio');

    expect(await screen.findByText('Oil change')).toBeInTheDocument();
  });

  it('creating a DROPDOWN field without any option shows a validation message and does not call the API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonRes(200, [emptySection])));
    renderPage();
    await screen.findByText('Engine services');
    await userEvent.click(screen.getByRole('button', { name: /add field/i }));
    await userEvent.type(screen.getByLabelText('English name'), 'Tyre season');
    await userEvent.selectOptions(screen.getByLabelText('Type'), 'DROPDOWN');

    const addButtons = screen.getAllByRole('button', { name: /add field/i });
    await userEvent.click(addButtons[addButtons.length - 1]);

    expect(await screen.findByText(/add at least one option/i)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1); // only the initial fetchDefinition
  });

  it('creating a new section sends titleEn and titleIt', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonRes(200, []))
      .mockResolvedValueOnce(jsonRes(201, { id: 'sec2', titleEn: 'Brakes', titleIt: 'Freni', sortOrder: 10, active: true, fields: [] }))
      .mockResolvedValueOnce(jsonRes(200, [{ id: 'sec2', titleEn: 'Brakes', titleIt: 'Freni', sortOrder: 10, active: true, fields: [] }]));
    vi.stubGlobal('fetch', fetchMock);
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /new section/i }));
    await userEvent.type(screen.getByLabelText('English title'), 'Brakes');
    await userEvent.type(screen.getByLabelText('Italian title (optional)'), 'Freni');
    await userEvent.click(screen.getByRole('button', { name: /create section/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body).toEqual({ titleEn: 'Brakes', titleIt: 'Freni' });
  });
});
