import { useTranslation } from 'react-i18next';
import { Badge } from '../../../components/Badge';
import { resolveLabel } from '../../../lib/i18n/resolveLabel';

const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

/** Read-only rendering of one stored value, shared by the record detail view and the print report. */
export function ValueDisplay({ type, value, unit }: { type: string; value: unknown; unit?: string }) {
  const { t, i18n } = useTranslation();
  switch (type) {
    case 'CHECKLIST': {
      const v = (value ?? {}) as { done?: boolean; urgent?: boolean; later?: boolean; note?: string };
      return (
        <span className="inline-flex items-center gap-1.5 flex-wrap">
          {v.done && <Badge tone="moss">{t('field.done')}</Badge>}
          {v.urgent && <Badge tone="rust">{t('field.urgent')}</Badge>}
          {v.later && <Badge tone="amber">{t('field.later')}</Badge>}
          {v.note && <span className="text-muted text-sm">{v.note}</span>}
        </span>
      );
    }
    case 'SINGLE_CHOICE': case 'DROPDOWN': {
      const v = value as { labelEn?: string; labelIt?: string | null } | null;
      return <span>{v ? resolveLabel(i18n.language, v.labelEn ?? '', v.labelIt) : t('common.none')}</span>;
    }
    case 'MULTI_CHOICE': {
      const v = value as { options?: { labelEn: string; labelIt: string | null }[] } | null;
      return <span>{v?.options?.map((o) => resolveLabel(i18n.language, o.labelEn, o.labelIt)).join(', ') || t('common.none')}</span>;
    }
    case 'TEXT': case 'TEXTAREA': {
      const v = value as { text?: string } | null;
      return <span className="whitespace-pre-wrap">{v?.text ?? t('common.none')}</span>;
    }
    case 'NUMBER': {
      const v = value as { number?: number } | null;
      return <span>{v?.number != null ? `${v.number}${unit ? ` ${unit}` : ''}` : t('common.none')}</span>;
    }
    default:
      return <span>{t('common.none')}</span>;
  }
}

export { titleCase };
