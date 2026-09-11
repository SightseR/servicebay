import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import i18n from '../lib/i18n';
import { LanguageSwitcher } from './LanguageSwitcher';

describe('LanguageSwitcher', () => {
  beforeEach(() => { window.localStorage.clear(); });
  afterEach(async () => { await i18n.changeLanguage('en'); });

  it('switches the active i18next language and persists the choice', async () => {
    render(<LanguageSwitcher />);
    await userEvent.click(screen.getByRole('button', { name: /IT/i }));
    expect(i18n.language).toBe('it');
    expect(window.localStorage.getItem('sb-lang')).toBe('it');

    await userEvent.click(screen.getByRole('button', { name: /EN/i }));
    expect(i18n.language).toBe('en');
    expect(window.localStorage.getItem('sb-lang')).toBe('en');
  });

  it('marks the active language button as pressed', async () => {
    render(<LanguageSwitcher />);
    const en = screen.getByRole('button', { name: /EN/i });
    const it = screen.getByRole('button', { name: /IT/i });
    expect(en).toHaveAttribute('aria-pressed', 'true');
    expect(it).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(it);
    expect(it).toHaveAttribute('aria-pressed', 'true');
  });
});
