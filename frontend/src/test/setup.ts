import '@testing-library/jest-dom/vitest';
import { beforeAll } from 'vitest';
import i18n from '../lib/i18n';

// Component tests assert on English strings written before i18n existed; pin the
// language here so those assertions keep working. Tests that specifically need to
// verify Italian rendering call i18n.changeLanguage('it') themselves and revert after.
beforeAll(async () => {
  await i18n.changeLanguage('en');
});
