import { useAppDispatch } from '../../../app/hooks';
import {
  createField, createOption, createSection, deleteField, deleteOption, deleteSection,
  fetchDefinition, reorderFields, reorderOptions, reorderSections, updateField, updateOption, updateSection,
} from './formBuilderSlice';
import type {
  CreateFieldInput, UpdateFieldInput, UpdateOptionInput, UpdateSectionInput,
} from './formBuilderSlice';

/**
 * Every mutation refetches the definition on success (see formBuilderSlice for why —
 * the tree is small and this avoids client-side tree-patching bugs). This hook centralises
 * that "mutate, then refresh" pattern so components just call e.g. actions.createSection(...).
 */
export function useFormBuilderActions() {
  const dispatch = useAppDispatch();
  const refresh = () => dispatch(fetchDefinition());

  const run = async <T,>(promise: Promise<{ meta: { requestStatus: string } } & T>) => {
    const res = await promise;
    if (res.meta.requestStatus === 'fulfilled') await refresh();
    return res;
  };

  return {
    refresh,
    createSection: (dto: { titleEn: string; titleIt?: string | null }) => run(dispatch(createSection(dto))),
    updateSection: (dto: UpdateSectionInput) => run(dispatch(updateSection(dto))),
    deleteSection: (id: string) => run(dispatch(deleteSection(id))),
    reorderSections: (ids: string[]) => run(dispatch(reorderSections(ids))),
    createField: (dto: CreateFieldInput) => run(dispatch(createField(dto))),
    updateField: (dto: UpdateFieldInput) => run(dispatch(updateField(dto))),
    deleteField: (id: string) => run(dispatch(deleteField(id))),
    reorderFields: (sectionId: string, ids: string[]) => run(dispatch(reorderFields({ sectionId, ids }))),
    createOption: (fieldId: string, labelEn: string, labelIt?: string | null) => run(dispatch(createOption({ fieldId, labelEn, labelIt }))),
    updateOption: (dto: UpdateOptionInput) => run(dispatch(updateOption(dto))),
    deleteOption: (id: string, fieldId: string) => run(dispatch(deleteOption({ id, fieldId }))),
    reorderOptions: (fieldId: string, ids: string[]) => run(dispatch(reorderOptions({ fieldId, ids }))),
  };
}
