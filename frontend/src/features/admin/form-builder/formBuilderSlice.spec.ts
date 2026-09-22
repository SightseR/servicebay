import { configureStore } from '@reduxjs/toolkit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import reducer, { createField, createSection, deleteSection, fetchDefinition, updateSection } from './formBuilderSlice';

const jsonRes = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const buildStore = () => configureStore({ reducer: { formBuilder: reducer } });

describe('formBuilderSlice', () => {
  afterEach(() => vi.restoreAllMocks());

  it('fetchDefinition populates sections and clears busy flags', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonRes(200, [{ id: 's1', titleEn: 'Engine', titleIt: null, sortOrder: 10, active: true, fields: [] }])));
    const store = buildStore();
    await store.dispatch(fetchDefinition());
    expect(store.getState().formBuilder.sections).toHaveLength(1);
    expect(store.getState().formBuilder.sections[0].titleEn).toBe('Engine');
  });

  it('createSection sets and clears the __new_section busy flag around the request', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonRes(201, { id: 's2', titleEn: 'Brakes', titleIt: 'Freni', sortOrder: 20, active: true, fields: [] })));
    const store = buildStore();
    const promise = store.dispatch(createSection({ titleEn: 'Brakes', titleIt: 'Freni' }));
    expect(store.getState().formBuilder.busy.__new_section).toBe(true);
    await promise;
    expect(store.getState().formBuilder.busy.__new_section).toBe(false);
  });

  it('a rejected updateSection records a row-scoped error keyed by section id', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonRes(409, { message: 'Section has fields — deactivate it instead' })));
    const store = buildStore();
    await store.dispatch(updateSection({ id: 's1', active: false }));
    const state = store.getState().formBuilder;
    expect(state.busy.s1).toBe(false);
    expect(state.rowError.s1).toBe('Section has fields — deactivate it instead');
  });

  it('deleteSection rejection is scoped to that section only', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonRes(409, { message: 'Section has fields — deactivate it instead' })));
    const store = buildStore();
    await store.dispatch(deleteSection('s1'));
    expect(store.getState().formBuilder.rowError.s1).toBe('Section has fields — deactivate it instead');
  });

  it('createField rejection is scoped to the section id (its "row" in the create form)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonRes(400, { message: 'DROPDOWN needs at least one option' })));
    const store = buildStore();
    await store.dispatch(createField({ sectionId: 's1', labelEn: 'Tyre season', type: 'DROPDOWN' }));
    expect(store.getState().formBuilder.rowError.s1).toBe('DROPDOWN needs at least one option');
  });
});
