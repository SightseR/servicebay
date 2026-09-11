import { Badge } from '../../../components/Badge';

const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

/** Read-only rendering of one stored value, shared by the record detail view and the print report. */
export function ValueDisplay({ type, value, unit }: { type: string; value: unknown; unit?: string }) {
  switch (type) {
    case 'CHECKLIST': {
      const v = (value ?? {}) as { done?: boolean; urgent?: boolean; later?: boolean; note?: string };
      return (
        <span className="inline-flex items-center gap-1.5 flex-wrap">
          {v.done && <Badge tone="moss">Done</Badge>}
          {v.urgent && <Badge tone="rust">Urgent</Badge>}
          {v.later && <Badge tone="amber">Later</Badge>}
          {v.note && <span className="text-muted text-sm">{v.note}</span>}
        </span>
      );
    }
    case 'SINGLE_CHOICE': case 'DROPDOWN': {
      const v = value as { label?: string } | null;
      return <span>{v?.label ?? '—'}</span>;
    }
    case 'MULTI_CHOICE': {
      const v = value as { options?: { label: string }[] } | null;
      return <span>{v?.options?.map((o) => o.label).join(', ') || '—'}</span>;
    }
    case 'TEXT': case 'TEXTAREA': {
      const v = value as { text?: string } | null;
      return <span className="whitespace-pre-wrap">{v?.text ?? '—'}</span>;
    }
    case 'NUMBER': {
      const v = value as { number?: number } | null;
      return <span>{v?.number != null ? `${v.number}${unit ? ` ${unit}` : ''}` : '—'}</span>;
    }
    default:
      return <span>—</span>;
  }
}

export { titleCase };
