import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function Pagination({
  page, pages, total, onChange,
}: { page: number; pages: number; total: number; onChange: (page: number) => void }) {
  const { t } = useTranslation();
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-steel text-sm text-muted">
      <span>{t('records.recordCount', { count: total })}</span>
      <div className="flex items-center gap-2">
        <button className="btn-ghost !px-2 !py-1" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span>{t('records.pageOf', { page, pages })}</span>
        <button className="btn-ghost !px-2 !py-1" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
