import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import i18n from '../../../lib/i18n';
import type { FormFieldDef } from '../types';
import { ChecklistField } from './ChecklistField';

const field: FormFieldDef = {
  id: 'f1', labelEn: 'Oil change', labelIt: 'Cambio olio', type: 'CHECKLIST',
  required: false, sortOrder: 10, showInReport: true, config: {}, options: [],
};
const noop = () => {};
const emptyValue = { done: false, urgent: false, later: false, note: '' };

describe('ChecklistField — bilingual label switching', () => {
  afterEach(async () => { await i18n.changeLanguage('en'); });

  it('shows the English label by default', () => {
    render(<ChecklistField field={field} value={emptyValue} onChange={noop} />);
    expect(screen.getByText('Oil change')).toBeInTheDocument();
  });

  it('shows the Italian label once the language is switched to it', async () => {
    await i18n.changeLanguage('it');
    render(<ChecklistField field={field} value={emptyValue} onChange={noop} />);
    expect(screen.getByText('Cambio olio')).toBeInTheDocument();
    expect(screen.getByText('Fatto')).toBeInTheDocument(); // "Done" chip, translated
  });

  it('falls back to English when Italian is not set for this field', async () => {
    await i18n.changeLanguage('it');
    render(<ChecklistField field={{ ...field, labelIt: null }} value={emptyValue} onChange={noop} />);
    expect(screen.getByText('Oil change')).toBeInTheDocument();
  });
});
