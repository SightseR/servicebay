import { useTranslation } from 'react-i18next';
import type { AppLanguage } from '../lib/i18n';
import { persistLanguage, SUPPORTED_LANGUAGES } from '../lib/i18n';

const FLAG: Record<AppLanguage, string> = { it: '🇮🇹', en: '🇬🇧' };
const LABEL: Record<AppLanguage, string> = { it: 'IT', en: 'EN' };

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = (i18n.language as AppLanguage) in FLAG ? (i18n.language as AppLanguage) : 'it';

  const setLang = (lang: AppLanguage) => {
    void i18n.changeLanguage(lang);
    persistLanguage(lang);
  };

  return (
    <div className="flex items-center gap-1 rounded border border-steel p-0.5" role="group" aria-label="Language">
      {SUPPORTED_LANGUAGES.map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => setLang(lang)}
          aria-pressed={current === lang}
          className={`px-2 py-1 rounded-sm text-xs flex items-center gap-1 transition-colors ${
            current === lang ? 'bg-amber/15 text-amber' : 'text-muted hover:text-ink'
          }`}
        >
          <span aria-hidden="true">{FLAG[lang]}</span>
          {LABEL[lang]}
        </button>
      ))}
    </div>
  );
}
