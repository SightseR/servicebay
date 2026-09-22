import { useTranslation } from 'react-i18next';
import { Badge } from '../../../../components/Badge';
import type { FieldType } from '../types';

const KEY: Record<FieldType, string> = {
  CHECKLIST: 'builder.typeChecklist', SINGLE_CHOICE: 'builder.typeSingle', DROPDOWN: 'builder.typeDropdown',
  MULTI_CHOICE: 'builder.typeMulti', TEXT: 'builder.typeText', TEXTAREA: 'builder.typeTextarea', NUMBER: 'builder.typeNumber',
};

export function FieldTypeBadge({ type }: { type: FieldType }) {
  const { t } = useTranslation();
  return <Badge tone="muted">{t(KEY[type])}</Badge>;
}

export function FieldTypeSelect({ value, onChange, disabled }: { value: FieldType; onChange: (t: FieldType) => void; disabled?: boolean }) {
  const { t } = useTranslation();
  return (
    <select className="field-input" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as FieldType)}>
      {Object.entries(KEY).map(([type, key]) => <option key={type} value={type}>{t(key)}</option>)}
    </select>
  );
}
