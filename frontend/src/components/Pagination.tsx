import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({
  page, pages, total, onChange,
}: { page: number; pages: number; total: number; onChange: (page: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-steel text-sm text-muted">
      <span>{total} record{total === 1 ? '' : 's'}</span>
      <div className="flex items-center gap-2">
        <button className="btn-ghost !px-2 !py-1" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span>Page {page} of {pages}</span>
        <button className="btn-ghost !px-2 !py-1" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
