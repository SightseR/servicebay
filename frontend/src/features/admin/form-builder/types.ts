export type FieldType = 'CHECKLIST' | 'SINGLE_CHOICE' | 'DROPDOWN' | 'MULTI_CHOICE' | 'TEXT' | 'TEXTAREA' | 'NUMBER';
export const FIELD_TYPES: FieldType[] = ['CHECKLIST', 'SINGLE_CHOICE', 'DROPDOWN', 'MULTI_CHOICE', 'TEXT', 'TEXTAREA', 'NUMBER'];
export const CHOICE_TYPES: FieldType[] = ['SINGLE_CHOICE', 'DROPDOWN', 'MULTI_CHOICE'];

export interface FieldConfig {
  unit?: string; min?: number; max?: number; step?: number;
  maxLength?: number; placeholder?: string;
  allowNote?: boolean; notePlaceholder?: string;
  legacyKey?: string;
}

export interface BuilderOption {
  id: string; labelEn: string; labelIt: string | null; sortOrder: number; active: boolean;
}
export interface BuilderField {
  id: string; sectionId: string; labelEn: string; labelIt: string | null; type: FieldType;
  required: boolean; sortOrder: number; active: boolean; showInReport: boolean;
  config: FieldConfig; options: BuilderOption[];
}
export interface BuilderSection {
  id: string; titleEn: string; titleIt: string | null; sortOrder: number; active: boolean; fields: BuilderField[];
}
